import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('audit')
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  /**
   * GET /api/audit
   * Liste des logs d'audit avec pagination et filtres.
   */
  @Roles(Role.ADMIN, Role.COMMISSION, Role.OBSERVATEUR)
  @Get()
  findAll(
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogService.findAll({
      action,
      actorId,
      entity,
      entityId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}
