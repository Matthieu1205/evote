import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { Prisma, ElectionStatus } from '@prisma/client';

@Injectable()
export class ElectionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
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

    const { positions, startAt, endAt, ...rest } = dto;
    const updateData: Prisma.ElectionUpdateInput = {
      ...rest,
      ...(startAt ? { startAt: new Date(startAt) } : {}),
      ...(endAt ? { endAt: new Date(endAt) } : {}),
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
    return election;
  }
}
