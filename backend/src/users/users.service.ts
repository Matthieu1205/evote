import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../common/password.service';
import { EmailService } from '../common/email.service';
import { AuditService } from '../common/audit.service';
import { CryptoService } from '../crypto/crypto.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma, Role, MemberStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private password: PasswordService,
    private email: EmailService,
    private audit: AuditService,
    private crypto: CryptoService,
  ) {}

  async findAll(params: {
    role?: Role;
    status?: MemberStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { role, status, search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
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

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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

  async create(dto: CreateUserDto, actorId?: string): Promise<object> {
    // Vérifier unicité
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { ordreNumber: dto.ordreNumber }] },
    });
    if (existing)
      throw new ConflictException("Email ou numéro d'ordre déjà utilisé.");

    const tempPassword = this.crypto.randomPassword(12);
    const passwordHash = await this.password.hashPassword(tempPassword);

    const user = await this.prisma.user.create({
      data: {
        ordreNumber: dto.ordreNumber,
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
    });

    // Tenter d'envoyer l'email de bienvenue (ne bloque pas si SMTP non configuré)
    try {
      await this.email.sendWelcomeEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        user.ordreNumber,
        tempPassword,
      );
    } catch (e) {
      console.warn("[EMAIL] Impossible d'envoyer l'email de bienvenue:", e);
    }

    const { passwordHash: _passwordHash, ...result } = user;
    return result;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actorId?: string,
  ): Promise<object> {
    await this.findOne(id); // Vérifie l'existence

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
    });

    const { passwordHash: _passwordHash, ...result } = user;
    return result;
  }

  async resetPassword(
    id: string,
    actorId?: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const tempPassword = this.crypto.randomPassword(12);
    const passwordHash = await this.password.hashPassword(tempPassword);

    await this.prisma.user.update({ where: { id }, data: { passwordHash } });

    await this.audit.log({
      actorId,
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: id,
    });

    try {
      await this.email.sendWelcomeEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        user.ordreNumber,
        tempPassword,
      );
    } catch (e) {
      console.warn(
        "[EMAIL] Impossible d'envoyer le mot de passe réinitialisé:",
        e,
      );
    }

    return {
      message: `Mot de passe réinitialisé. Un email a été envoyé à ${user.email}.`,
    };
  }

  async remove(id: string, actorId?: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    await this.audit.log({
      actorId,
      action: 'USER_DELETED',
      entity: 'User',
      entityId: id,
    });
    return { message: 'Utilisateur supprimé.' };
  }

  async exportCsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
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
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
