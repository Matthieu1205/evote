import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    params: {
      action?: string;
      actorId?: string;
      entity?: string;
      entityId?: string;
      from?: Date;
      to?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const {
      action,
      actorId,
      entity,
      entityId,
      from,
      to,
      page = 1,
      limit = 50,
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = { organizationId };
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (actorId) where.actorId = actorId;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Prisma.DateTimeFilter).gte = from;
      if (to) (where.createdAt as Prisma.DateTimeFilter).lte = to;
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              ordreNumber: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
}
