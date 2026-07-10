import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../common/password.service';
import { EmailService } from '../common/email.service';
import { AuditService } from '../common/audit.service';
import { CryptoService } from '../crypto/crypto.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateOrgAdminDto } from './dto/create-org-admin.dto';
import { RegisterOrganizationDto } from './dto/register-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private password: PasswordService,
    private email: EmailService,
    private audit: AuditService,
    private crypto: CryptoService,
  ) {}

  /**
   * GET /organizations/lookup?slug= — utilisé par la page de connexion pour
   * valider l'organisation avant de tenter l'authentification.
   */
  async lookup(slug: string) {
    const org = await this.prisma.organization.findFirst({
      where: { slug, isPlatform: false },
      select: { name: true, logoUrl: true },
    });
    if (!org) throw new NotFoundException('Organisation introuvable.');
    return org;
  }

  async findAll() {
    return this.prisma.organization.findMany({
      where: { isPlatform: false },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true } } },
    });
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, isPlatform: false },
      include: { _count: { select: { users: true } } },
    });
    if (!org) throw new NotFoundException('Organisation introuvable.');
    return org;
  }

  /**
   * POST /organizations/register — inscription publique d'une nouvelle organisation.
   * Crée l'org + le premier compte ADMIN avec le mot de passe choisi par l'utilisateur.
   */
  async register(dto: RegisterOrganizationDto): Promise<{ message: string; organizationSlug: string }> {
    const existing = await this.prisma.organization.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Ce slug est déjà utilisé. Choisissez-en un autre.');

    const emailTaken = await this.prisma.user.findFirst({ where: { email: dto.adminEmail } });
    if (emailTaken) throw new ConflictException('Cette adresse email est déjà associée à un compte.');

    const org = await this.prisma.organization.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        memberLabel: dto.memberLabel || 'Numéro de membre',
        primaryColor: dto.primaryColor || '#059669',
      },
    });

    const passwordHash = await this.password.hashPassword(dto.adminPassword);
    const ordreNumber = `ADMIN-${org.id.slice(-6).toUpperCase()}`;

    const user = await this.prisma.user.create({
      data: {
        organizationId: org.id,
        ordreNumber,
        email: dto.adminEmail,
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIF',
        isEligible: false,
      },
    });

    await this.audit.log({
      actorId: user.id,
      action: 'ORGANIZATION_CREATED',
      entity: 'Organization',
      entityId: org.id,
      organizationId: org.id,
    });

    this.email
      .sendWelcomeEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        user.ordreNumber,
        '',
      )
      .catch(() => {});

    return { message: 'Organisation créée avec succès.', organizationSlug: org.slug };
  }

  async create(dto: CreateOrganizationDto, actorId?: string) {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException('Ce slug est déjà utilisé.');

    const org = await this.prisma.organization.create({ data: { ...dto } });

    await this.audit.log({
      actorId,
      action: 'ORGANIZATION_CREATED',
      entity: 'Organization',
      entityId: org.id,
    });

    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto, actorId?: string) {
    await this.findOne(id);
    const org = await this.prisma.organization.update({
      where: { id },
      data: dto,
    });

    await this.audit.log({
      actorId,
      action: 'ORGANIZATION_UPDATED',
      entity: 'Organization',
      entityId: id,
    });

    return org;
  }

  /**
   * PUT /organizations/me — un ADMIN d'organisation édite sa propre branding.
   */
  async updateOwn(
    organizationId: string,
    dto: UpdateOrganizationDto,
    actorId?: string,
  ) {
    const org = await this.prisma.organization.update({
      where: { id: organizationId },
      data: dto,
    });

    await this.audit.log({
      actorId,
      action: 'ORGANIZATION_UPDATED',
      entity: 'Organization',
      entityId: organizationId,
      organizationId,
    });

    return org;
  }

  /**
   * POST /organizations/:id/admins — crée le premier compte ADMIN d'une
   * organisation nouvellement créée.
   */
  async createAdmin(
    organizationId: string,
    dto: CreateOrgAdminDto,
    actorId?: string,
  ): Promise<object> {
    await this.findOne(organizationId);

    const existing = await this.prisma.user.findFirst({
      where: {
        organizationId,
        OR: [{ email: dto.email }, { ordreNumber: dto.ordreNumber }],
      },
    });
    if (existing)
      throw new ConflictException("Email ou numéro d'ordre déjà utilisé.");

    const tempPassword = this.crypto.randomPassword(12);
    const passwordHash = await this.password.hashPassword(tempPassword);

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        ordreNumber: dto.ordreNumber,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIF',
        isEligible: false,
      },
    });

    await this.audit.log({
      actorId,
      action: 'ORG_ADMIN_CREATED',
      entity: 'User',
      entityId: user.id,
      organizationId,
    });

    this.email
      .sendWelcomeEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        user.ordreNumber,
        tempPassword,
      )
      .catch((e) => console.warn("[EMAIL] Impossible d'envoyer l'email de bienvenue:", e));

    const { passwordHash: _passwordHash, ...result } = user;
    return { ...result, tempPassword };
  }
}
