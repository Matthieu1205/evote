import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../common/password.service';
import { OtpService } from '../common/otp.service';
import { AuditService } from '../common/audit.service';
import { LoginDto } from './dto/login.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private password: PasswordService,
    private otp: OtpService,
    private audit: AuditService,
  ) {}

  /**
   * Résout un slug d'organisation en id. L'organisation plateforme est
   * incluse : les SUPER_ADMIN se connectent via ce même flux avec le
   * slug "platform".
   */
  private async resolveOrganizationId(slug: string): Promise<string | null> {
    const org = await this.prisma.organization.findUnique({
      where: { slug },
    });
    return org?.id ?? null;
  }

  /**
   * Étape 1 : Vérifier identifiants et envoyer un OTP par email.
   */
  async requestOtp(
    dto: RequestOtpDto,
    ip?: string,
  ): Promise<{ message: string; devCode?: string }> {
    const organizationId = await this.resolveOrganizationId(
      dto.organizationSlug,
    );
    if (!organizationId) {
      return { message: 'Si ce compte existe, un OTP a été envoyé.' };
    }

    const user = await this.prisma.user.findUnique({
      where: {
        organizationId_ordreNumber: {
          organizationId,
          ordreNumber: dto.ordreNumber,
        },
      },
    });

    if (!user) {
      // Réponse générique pour éviter l'énumération d'utilisateurs.
      return { message: 'Si ce compte existe, un OTP a été envoyé.' };
    }

    const okPwd = await this.password.verifyPassword(
      user.passwordHash,
      dto.password,
    );
    if (!okPwd) {
      await this.audit.log({
        actorId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        ip,
        organizationId: user.organizationId,
      });
      // Réponse générique.
      return { message: 'Si ce compte existe, un OTP a été envoyé.' };
    }

    if (user.status !== 'ACTIF') {
      throw new UnauthorizedException('Ce compte est suspendu ou radié.');
    }

    const { code } = await this.otp.issueOtp(user.id, 'LOGIN');
    const exposeCode = process.env.OTP_EXPOSE_CODE === 'true';
    return {
      message: 'Code OTP envoyé par email.',
      ...(exposeCode ? { devCode: code } : {}),
    };
  }

  /**
   * Étape 2 : Valider l'OTP et créer la session.
   */
  async login(dto: LoginDto, req: Request): Promise<object> {
    const ip = req.ip;
    const organizationId = await this.resolveOrganizationId(
      dto.organizationSlug,
    );
    if (!organizationId) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        organizationId_ordreNumber: {
          organizationId,
          ordreNumber: dto.ordreNumber,
        },
      },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const okPwd = await this.password.verifyPassword(
      user.passwordHash,
      dto.password,
    );
    if (!okPwd) {
      await this.audit.log({
        actorId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        ip,
        organizationId: user.organizationId,
      });
      throw new UnauthorizedException('Identifiants invalides.');
    }

    if (user.status !== 'ACTIF') {
      throw new UnauthorizedException('Ce compte est suspendu ou radié.');
    }

    const okOtp = await this.otp.verifyOtp(user.id, 'LOGIN', dto.otp);
    if (!okOtp) {
      await this.audit.log({
        actorId: user.id,
        action: 'LOGIN_OTP_FAILED',
        entity: 'User',
        entityId: user.id,
        ip,
        organizationId: user.organizationId,
      });
      throw new UnauthorizedException('Code OTP invalide ou expiré.');
    }

    // Créer la session.
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.ordreNumber = user.ordreNumber;
    req.session.organizationId = user.organizationId;

    await this.audit.log({
      actorId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'User',
      entityId: user.id,
      ip,
      organizationId: user.organizationId,
    });

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      ordreNumber: user.ordreNumber,
      status: user.status,
      organization: {
        name: user.organization.name,
        slug: user.organization.slug,
        logoUrl: user.organization.logoUrl,
        primaryColor: user.organization.primaryColor,
        memberLabel: user.organization.memberLabel,
      },
    };
  }

  async logout(req: Request): Promise<{ message: string }> {
    const userId = req.session.userId;

    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err)
          return reject(
            new BadRequestException('Erreur lors de la déconnexion.'),
          );
        if (userId) {
          this.audit
            .log({ actorId: userId, action: 'LOGOUT' })
            .catch(console.error);
        }
        resolve({ message: 'Déconnexion réussie.' });
      });
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const ok = await this.password.verifyPassword(
      user.passwordHash,
      currentPassword,
    );
    if (!ok) throw new UnauthorizedException('Mot de passe actuel incorrect.');

    if (currentPassword === newPassword) {
      throw new ForbiddenException(
        "Le nouveau mot de passe doit être différent de l'actuel.",
      );
    }

    const newHash = await this.password.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    await this.audit.log({
      actorId: userId,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: userId,
    });

    return { message: 'Mot de passe modifié avec succès.' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const organizationId = await this.resolveOrganizationId(
      dto.organizationSlug,
    );
    const user = organizationId
      ? await this.prisma.user.findUnique({
          where: {
            organizationId_ordreNumber: {
              organizationId,
              ordreNumber: dto.ordreNumber,
            },
          },
        })
      : null;
    // Réponse générique pour éviter l'énumération d'utilisateurs
    if (!user || user.status !== 'ACTIF') {
      return {
        message:
          'Si ce compte existe, un code de réinitialisation a été envoyé.',
      };
    }
    await this.otp.issueOtp(user.id, 'RESET');
    return {
      message: 'Si ce compte existe, un code de réinitialisation a été envoyé.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const organizationId = await this.resolveOrganizationId(
      dto.organizationSlug,
    );
    const user = organizationId
      ? await this.prisma.user.findUnique({
          where: {
            organizationId_ordreNumber: {
              organizationId,
              ordreNumber: dto.ordreNumber,
            },
          },
        })
      : null;
    if (!user) throw new UnauthorizedException('Compte introuvable.');

    const ok = await this.otp.verifyOtp(user.id, 'RESET', dto.otp);
    if (!ok) throw new UnauthorizedException('Code invalide ou expiré.');

    const newHash = await this.password.hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await this.audit.log({
      actorId: user.id,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: user.id,
    });
    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  async getMe(userId: string): Promise<object> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
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
        photoUrl: true,
        createdAt: true,
        organization: {
          select: {
            name: true,
            slug: true,
            logoUrl: true,
            primaryColor: true,
            memberLabel: true,
          },
        },
      },
    });
    return user;
  }

  async updateProfile(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<object> {
    const firstName = data['firstName'] as string | undefined;
    const lastName = data['lastName'] as string | undefined;
    const phone = data['phone'] as string | null | undefined;
    const section = data['section'] as string | null | undefined;
    const region = data['region'] as string | null | undefined;
    const photoUrl = data['photoUrl'] as string | null | undefined;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { firstName, lastName, phone, section, region, photoUrl },
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
        photoUrl: true,
        createdAt: true,
      },
    });
    return user;
  }
}
