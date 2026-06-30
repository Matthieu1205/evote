import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    actorId?: string | null;
    action: string;
    entity?: string;
    entityId?: string;
    meta?: Prisma.InputJsonValue;
    ip?: string | null;
    organizationId?: string | null;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId ?? null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          meta: params.meta,
          ip: params.ip ?? null,
          organizationId: params.organizationId ?? null,
        },
      });
    } catch (e) {
      // Ne jamais bloquer l'opération métier sur une erreur de log.
      console.error('Echec journalisation audit:', e);
    }
  }
}
