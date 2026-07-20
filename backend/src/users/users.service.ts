import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../common/password.service';
import { EmailService } from '../common/email.service';
import { AuditService } from '../common/audit.service';
import { CryptoService } from '../crypto/crypto.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma, Role, MemberStatus } from '@prisma/client';

/**
 * Neutralise l'injection de formule CSV : un champ commençant par
 * =, +, -, @ ou une tabulation est interprété comme une formule par
 * Excel/Sheets à l'ouverture. On préfixe d'une apostrophe pour forcer
 * une lecture en texte brut.
 */
function sanitizeCsvField(value: string): string {
  return /^[=+\-@\t]/.test(value) ? `'${value}` : value;
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private password: PasswordService,
    private email: EmailService,
    private audit: AuditService,
    private crypto: CryptoService,
  ) {}

  async findAll(
    organizationId: string,
    params: {
      role?: Role;
      status?: MemberStatus;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { role, status, search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { organizationId };
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { ordreNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: 'asc' },
        select: {
          id: true,
          ordreNumber: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          isEligible: true,
          section: true,
          region: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        ordreNumber: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        isEligible: true,
        section: true,
        region: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException(`Utilisateur ${id} introuvable.`);
    return user;
  }

  async create(
    organizationId: string,
    dto: CreateUserDto,
    actorId?: string,
  ): Promise<object> {
    if (dto.role === 'SUPER_ADMIN') {
      throw new ForbiddenException(
        "Le rôle Super Administrateur ne peut pas être attribué depuis la gestion des membres.",
      );
    }

    const emailExists = await this.prisma.user.findFirst({
      where: { organizationId, email: dto.email },
    });
    if (emailExists) throw new ConflictException('Email déjà utilisé.');

    let ordreNumber = dto.ordreNumber?.trim();
    if (ordreNumber) {
      const ordreExists = await this.prisma.user.findFirst({
        where: { organizationId, ordreNumber },
      });
      if (ordreExists)
        throw new ConflictException("Numéro d'ordre déjà utilisé.");
    } else {
      ordreNumber = await this.generateOrdreNumber(organizationId);
    }

    const tempPassword = this.crypto.randomPassword(12);
    const passwordHash = await this.password.hashPassword(tempPassword);

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        ordreNumber,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role: dto.role ?? 'ELECTEUR',
        status: dto.status ?? 'ACTIF',
        isEligible: dto.isEligible ?? true,
        section: dto.section,
        region: dto.region,
        phone: dto.phone,
      },
    });

    await this.audit.log({
      actorId,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      organizationId,
    });

    this.email
      .sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`, user.ordreNumber, tempPassword)
      .catch((e) => console.warn("[EMAIL] Impossible d'envoyer l'email de bienvenue:", e));

    const { passwordHash: _passwordHash, ...result } = user;
    return result;
  }

  private async generateOrdreNumber(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    });
    const prefix = (org?.slug || 'MBR').toUpperCase();

    let seq = (await this.prisma.user.count({ where: { organizationId } })) + 1;
    let candidate = `${prefix}-${String(seq).padStart(3, '0')}`;
    while (
      await this.prisma.user.findFirst({
        where: { organizationId, ordreNumber: candidate },
      })
    ) {
      seq += 1;
      candidate = `${prefix}-${String(seq).padStart(3, '0')}`;
    }
    return candidate;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateUserDto,
    actorId?: string,
  ): Promise<object> {
    if (dto.role === 'SUPER_ADMIN') {
      throw new ForbiddenException(
        "Le rôle Super Administrateur ne peut pas être attribué depuis la gestion des membres.",
      );
    }

    await this.findOne(organizationId, id); // Vérifie l'existence + l'appartenance

    const { password, ...fields } = dto;
    const updateData: Prisma.UserUpdateInput = { ...fields };

    if (password) {
      updateData.passwordHash = await this.password.hashPassword(password);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    await this.audit.log({
      actorId,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: id,
      organizationId,
    });

    const { passwordHash: _passwordHash, ...result } = user;
    return result;
  }

  async resetPassword(
    organizationId: string,
    id: string,
    actorId?: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const tempPassword = this.crypto.randomPassword(12);
    const passwordHash = await this.password.hashPassword(tempPassword);

    await this.prisma.user.update({ where: { id }, data: { passwordHash } });

    await this.audit.log({
      actorId,
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: id,
      organizationId,
    });

    this.email
      .sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`, user.ordreNumber, tempPassword)
      .catch((e) => console.warn("[EMAIL] Impossible d'envoyer le mot de passe réinitialisé:", e));

    return {
      message: `Mot de passe réinitialisé. Un email a été envoyé à ${user.email}.`,
    };
  }

  async remove(
    organizationId: string,
    id: string,
    actorId?: string,
  ): Promise<{ message: string }> {
    await this.findOne(organizationId, id);
    await this.prisma.user.delete({ where: { id } });
    await this.audit.log({
      actorId,
      action: 'USER_DELETED',
      entity: 'User',
      entityId: id,
      organizationId,
    });
    return { message: 'Utilisateur supprimé.' };
  }

  async importCsv(
    organizationId: string,
    csvText: string,
    actorId?: string,
  ): Promise<{ created: number; skipped: number; errors: { row: number; reason: string }[] }> {
    const lines = csvText.replace(/^\uFEFF/, '').replace(/\r/g, '').trim().split('\n');
    if (lines.length < 2) return { created: 0, skipped: 0, errors: [] };

    // Excel en locale française exporte les CSV avec ";" (la virgule est le
    // séparateur décimal). On détecte le séparateur depuis la ligne d'en-tête.
    const commaCount = (lines[0].match(/,/g) ?? []).length;
    const semicolonCount = (lines[0].match(/;/g) ?? []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    const parseRow = (line: string): string[] => {
      const cols: string[] = [];
      let cur = '';
      let inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === delimiter && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
        cur += ch;
      }
      cols.push(cur.trim());
      return cols;
    };

    // Normalisation tolérante : accents, casse, espaces/underscores/ponctuation
    // et pluriels retirés (ex: "ID_Membre" -> "idmembre", "Prénoms" -> "prenom").
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .replace(/s$/, '');

    const headers = parseRow(lines[0]).map(normalize);
    const col = (row: string[], ...keys: string[]) => {
      for (const k of keys) {
        const i = headers.indexOf(normalize(k));
        if (i !== -1) return row[i]?.trim() ?? '';
      }
      return '';
    };

    let created = 0;
    let skipped = 0;
    const errors: { row: number; reason: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const row = parseRow(lines[i]);
      const ordreNumber = col(row, 'ordrenumber', 'numero', 'numeromembre', 'numero de membre', 'membre', 'id_membre', 'id', 'matricule');
      const firstName = col(row, 'prenom', 'firstname', 'first_name');
      const lastName = col(row, 'nom', 'lastname', 'last_name');
      const email = col(row, 'email', 'mail', 'courriel');
      const section = col(row, 'section');
      const region = col(row, 'region');
      const phone = col(row, 'telephone', 'phone', 'tel');
      const eligibleRaw = col(row, 'eligible', 'iseligible');
      const isEligible = eligibleRaw === '' || ['oui', 'true', '1', 'yes'].includes(eligibleRaw.toLowerCase());

      if (!ordreNumber || !firstName || !lastName || !email) {
        errors.push({ row: i + 1, reason: 'Champs obligatoires manquants (numéro, prénom, nom, email).' });
        continue;
      }

      const existing = await this.prisma.user.findFirst({
        where: { organizationId, OR: [{ email }, { ordreNumber }] },
      });
      if (existing) { skipped++; continue; }

      try {
        const tempPassword = this.crypto.randomPassword(12);
        const passwordHash = await this.password.hashPassword(tempPassword);
        const user = await this.prisma.user.create({
          data: { organizationId, ordreNumber, email, firstName, lastName, passwordHash,
            role: 'ELECTEUR', status: 'ACTIF', isEligible,
            section: section || null, region: region || null, phone: phone || null },
        });
        await this.audit.log({ actorId, action: 'USER_CREATED', entity: 'User', entityId: user.id, organizationId });
        this.email.sendWelcomeEmail(email, `${firstName} ${lastName}`, ordreNumber, tempPassword).catch(() => {});
        created++;
      } catch {
        errors.push({ row: i + 1, reason: 'Erreur lors de la création.' });
      }
    }

    return { created, skipped, errors };
  }

  async exportCsv(organizationId: string): Promise<string> {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      orderBy: { lastName: 'asc' },
      select: {
        ordreNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        isEligible: true,
        section: true,
        region: true,
        phone: true,
        createdAt: true,
      },
    });

    const headers = [
      'Numéro Ordre',
      'Prénom',
      'Nom',
      'Email',
      'Rôle',
      'Statut',
      'Éligible',
      'Section',
      'Région',
      'Téléphone',
      'Créé le',
    ];

    const rows = users.map((u) =>
      [
        u.ordreNumber,
        u.firstName,
        u.lastName,
        u.email,
        u.role,
        u.status,
        u.isEligible ? 'Oui' : 'Non',
        u.section ?? '',
        u.region ?? '',
        u.phone ?? '',
        u.createdAt.toISOString(),
      ]
        .map((v) => `"${sanitizeCsvField(String(v)).replace(/"/g, '""')}"`)
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
