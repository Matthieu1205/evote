import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { EmailService } from '../common/email.service';
import { CandidacyStatus, Prisma } from '@prisma/client';
import { CreateCandidacyDto } from './dto/create-candidacy.dto';
import { ReviewCandidacyDto } from './dto/review-candidacy.dto';

@Injectable()
export class CandidaciesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private email: EmailService,
  ) {}

  async findAll(
    organizationId: string,
    params: {
      positionId?: string;
      status?: CandidacyStatus;
      electionId?: string;
      userId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const {
      positionId,
      status,
      electionId,
      userId,
      page = 1,
      limit = 50,
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CandidacyWhereInput = { organizationId };
    if (positionId) where.positionId = positionId;
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (electionId) where.position = { electionId };

    const [total, candidacies] = await Promise.all([
      this.prisma.candidacy.count({ where }),
      this.prisma.candidacy.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              ordreNumber: true,
              section: true,
            },
          },
          position: {
            include: {
              election: { select: { id: true, title: true, status: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: candidacies,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(organizationId: string, id: string) {
    const c = await this.prisma.candidacy.findFirst({
      where: { id, organizationId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            ordreNumber: true,
            section: true,
          },
        },
        position: {
          include: {
            election: { select: { id: true, title: true, status: true } },
          },
        },
      },
    });
    if (!c) throw new NotFoundException(`Candidature ${id} introuvable.`);
    return c;
  }

  async create(
    organizationId: string,
    dto: CreateCandidacyDto,
    userId: string,
  ) {
    // Vérifier que le poste existe au sein de l'organisation
    const position = await this.prisma.position.findFirst({
      where: { id: dto.positionId, organizationId },
      include: { election: true },
    });
    if (!position) throw new NotFoundException('Poste introuvable.');

    // Vérifier que l'élection est en phase PLANIFIE
    if (!['PLANIFIE', 'BROUILLON'].includes(position.election.status)) {
      throw new ForbiddenException(
        'Les candidatures ne sont plus ouvertes pour cette élection.',
      );
    }

    // Vérifier unicité
    const existing = await this.prisma.candidacy.findUnique({
      where: { positionId_userId: { positionId: dto.positionId, userId } },
    });
    if (existing) {
      throw new ConflictException(
        'Vous avez déjà soumis une candidature pour ce poste.',
      );
    }

    const candidacy = await this.prisma.candidacy.create({
      data: { ...dto, userId, organizationId },
      include: { position: { include: { election: true } }, user: true },
    });

    await this.audit.log({
      actorId: userId,
      action: 'CANDIDACY_SUBMITTED',
      entity: 'Candidacy',
      entityId: candidacy.id,
      organizationId,
    });

    return candidacy;
  }

  async validate(
    organizationId: string,
    id: string,
    dto: ReviewCandidacyDto,
    actorId: string,
  ) {
    await this.findOne(organizationId, id);

    const updated = await this.prisma.candidacy.update({
      where: { id },
      data: {
        status: 'VALIDEE',
        reviewedAt: new Date(),
        reviewNote: dto.reviewNote,
      },
      include: { user: true, position: true },
    });

    await this.audit.log({
      actorId,
      action: 'CANDIDACY_VALIDATED',
      entity: 'Candidacy',
      entityId: id,
      organizationId,
    });

    // Notification email
    try {
      await this.email.sendCandidacyStatusEmail(
        updated.user.email,
        `${updated.user.firstName} ${updated.user.lastName}`,
        updated.position.title,
        'VALIDEE',
      );
    } catch (e) {
      console.warn('[EMAIL] Notification candidature:', e);
    }

    return updated;
  }

  async reject(
    organizationId: string,
    id: string,
    dto: ReviewCandidacyDto,
    actorId: string,
  ) {
    await this.findOne(organizationId, id);

    const updated = await this.prisma.candidacy.update({
      where: { id },
      data: {
        status: 'REJETEE',
        reviewedAt: new Date(),
        reviewNote: dto.reviewNote,
      },
      include: { user: true, position: true },
    });

    await this.audit.log({
      actorId,
      action: 'CANDIDACY_REJECTED',
      entity: 'Candidacy',
      entityId: id,
      meta: { reviewNote: dto.reviewNote },
      organizationId,
    });

    // Notification email
    try {
      await this.email.sendCandidacyStatusEmail(
        updated.user.email,
        `${updated.user.firstName} ${updated.user.lastName}`,
        updated.position.title,
        'REJETEE',
        dto.reviewNote,
      );
    } catch (e) {
      console.warn('[EMAIL] Notification candidature:', e);
    }

    return updated;
  }

  async withdraw(organizationId: string, id: string, userId: string) {
    const candidacy = await this.findOne(organizationId, id);
    if (candidacy.userId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez retirer que votre propre candidature.',
      );
    }
    if (candidacy.status !== 'SOUMISE') {
      throw new ForbiddenException(
        'Seule une candidature soumise peut être retirée.',
      );
    }

    const updated = await this.prisma.candidacy.update({
      where: { id },
      data: { status: 'RETIREE' },
    });

    await this.audit.log({
      actorId: userId,
      action: 'CANDIDACY_WITHDRAWN',
      entity: 'Candidacy',
      entityId: id,
      organizationId,
    });

    return updated;
  }
}
