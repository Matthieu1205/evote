import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { EmailService } from '../common/email.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { Prisma, ElectionStatus } from '@prisma/client';

@Injectable()
export class ElectionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private email: EmailService,
  ) {}

  async findAll(
    organizationId: string,
    params: {
      status?: ElectionStatus;
      page?: number;
      limit?: number;
    },
  ) {
    const { status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.ElectionWhereInput = { organizationId };
    if (status) where.status = status;

    const [total, elections] = await Promise.all([
      this.prisma.election.count({ where }),
      this.prisma.election.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startAt: 'desc' },
        include: {
          positions: {
            orderBy: { order: 'asc' },
            include: { _count: { select: { candidacies: true } } },
          },
          _count: { select: { ballots: true, voteRecords: true } },
        },
      }),
    ]);

    return {
      data: elections,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(organizationId: string, id: string) {
    const election = await this.prisma.election.findFirst({
      where: { id, organizationId },
      include: {
        positions: {
          orderBy: { order: 'asc' },
          include: {
            candidacies: {
              where: { status: 'VALIDEE' },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    section: true,
                  },
                },
              },
            },
          },
        },
        _count: { select: { ballots: true, voteRecords: true } },
      },
    });
    if (!election) throw new NotFoundException(`Élection ${id} introuvable.`);
    return election;
  }

  async create(
    organizationId: string,
    dto: CreateElectionDto,
    actorId?: string,
  ) {
    const { positions, ...electionData } = dto;

    const election = await this.prisma.election.create({
      data: {
        ...electionData,
        organizationId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        candidacyStartAt: dto.candidacyStartAt ? new Date(dto.candidacyStartAt) : undefined,
        candidacyEndAt: dto.candidacyEndAt ? new Date(dto.candidacyEndAt) : undefined,
        positions: positions
          ? {
              create: positions.map((p, i) => ({
                organizationId,
                title: p.title,
                description: p.description,
                seats: p.seats ?? 1,
                order: p.order ?? i,
              })),
            }
          : undefined,
      },
      include: { positions: { orderBy: { order: 'asc' } } },
    });

    await this.audit.log({
      actorId,
      action: 'ELECTION_CREATED',
      entity: 'Election',
      entityId: election.id,
      organizationId,
    });

    return election;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateElectionDto,
    actorId?: string,
  ) {
    await this.findOne(organizationId, id);

    const { positions, startAt, endAt, candidacyStartAt, candidacyEndAt, ...rest } = dto;
    const updateData: Prisma.ElectionUpdateInput = {
      ...rest,
      ...(startAt ? { startAt: new Date(startAt) } : {}),
      ...(endAt ? { endAt: new Date(endAt) } : {}),
      ...(candidacyStartAt !== undefined ? { candidacyStartAt: candidacyStartAt ? new Date(candidacyStartAt) : null } : {}),
      ...(candidacyEndAt !== undefined ? { candidacyEndAt: candidacyEndAt ? new Date(candidacyEndAt) : null } : {}),
    };

    const election = await this.prisma.election.update({
      where: { id },
      data: updateData,
      include: { positions: { orderBy: { order: 'asc' } } },
    });

    await this.audit.log({
      actorId,
      action: 'ELECTION_UPDATED',
      entity: 'Election',
      entityId: id,
      meta: { status: dto.status },
      organizationId,
    });

    return election;
  }

  async remove(
    organizationId: string,
    id: string,
    actorId?: string,
  ): Promise<{ message: string }> {
    const election = await this.findOne(organizationId, id);
    if (election.status === 'OUVERT') {
      throw new BadRequestException(
        'Impossible de supprimer une élection en cours.',
      );
    }
    await this.prisma.election.delete({ where: { id } });
    await this.audit.log({
      actorId,
      action: 'ELECTION_DELETED',
      entity: 'Election',
      entityId: id,
      organizationId,
    });
    return { message: 'Élection supprimée.' };
  }

  async addPosition(
    organizationId: string,
    electionId: string,
    dto: { title: string; seats?: number },
    actorId?: string,
  ) {
    const election = await this.findOne(organizationId, electionId);
    if (!['BROUILLON', 'PLANIFIE'].includes(election.status)) {
      throw new BadRequestException("Impossible de modifier les postes d'un scrutin ouvert ou clos.");
    }
    const count = await this.prisma.position.count({ where: { electionId } });
    const pos = await this.prisma.position.create({
      data: { title: dto.title, seats: dto.seats ?? 1, electionId, organizationId, order: count },
    });
    await this.audit.log({ actorId, action: 'ELECTION_UPDATED', entity: 'Position', entityId: pos.id, organizationId });
    return pos;
  }

  async updatePosition(
    organizationId: string,
    electionId: string,
    posId: string,
    dto: { title?: string; seats?: number },
  ) {
    await this.findOne(organizationId, electionId);
    const pos = await this.prisma.position.findFirst({ where: { id: posId, electionId, organizationId } });
    if (!pos) throw new NotFoundException('Poste introuvable.');
    return this.prisma.position.update({
      where: { id: posId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.seats !== undefined ? { seats: dto.seats } : {}),
      },
    });
  }

  async removePosition(
    organizationId: string,
    electionId: string,
    posId: string,
    actorId?: string,
  ) {
    const election = await this.findOne(organizationId, electionId);
    if (!['BROUILLON', 'PLANIFIE'].includes(election.status)) {
      throw new BadRequestException("Impossible de supprimer un poste d'un scrutin ouvert ou clos.");
    }
    const pos = await this.prisma.position.findFirst({ where: { id: posId, electionId, organizationId } });
    if (!pos) throw new NotFoundException('Poste introuvable.');
    const cand = await this.prisma.candidacy.count({ where: { positionId: posId } });
    if (cand > 0) throw new BadRequestException(`Ce poste a ${cand} candidature(s). Retirez-les d'abord.`);
    await this.prisma.position.delete({ where: { id: posId } });
    await this.audit.log({ actorId, action: 'ELECTION_UPDATED', entity: 'Position', entityId: posId, organizationId });
    return { message: 'Poste supprimé.' };
  }

  async changeStatus(
    organizationId: string,
    id: string,
    status: ElectionStatus,
    actorId?: string,
  ) {
    await this.findOne(organizationId, id);
    const election = await this.prisma.election.update({
      where: { id },
      data: { status },
    });
    await this.audit.log({
      actorId,
      action: `ELECTION_STATUS_${status}`,
      entity: 'Election',
      entityId: id,
      organizationId,
    });

    if (status === 'OUVERT') {
      const loginUrl = `${process.env.FRONTEND_URL ?? 'https://evote-ashy.vercel.app'}/login`;
      const voters = await this.prisma.user.findMany({
        where: { organizationId, isEligible: true, status: 'ACTIF', role: 'ELECTEUR' },
        select: { email: true, firstName: true, lastName: true },
      });
      for (const voter of voters) {
        this.email
          .sendElectionOpenEmail(voter.email, `${voter.firstName} ${voter.lastName}`, election.title, loginUrl)
          .catch(() => {});
      }
    }

    return election;
  }
}
