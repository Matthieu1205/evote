import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { SessionUser } from '../common/decorators/session-user.interface';
import { Role } from '@prisma/client';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Roles(Role.ADMIN, Role.COMMISSION, Role.OBSERVATEUR)
  @Get('stats')
  getStats(@CurrentUser() user: SessionUser) {
    return this.dashboardService.getStats(user.organizationId);
  }

  @Roles(Role.ADMIN, Role.COMMISSION, Role.OBSERVATEUR)
  @Get('charts')
  getCharts(@CurrentUser() user: SessionUser) {
    return this.dashboardService.getCharts(user.organizationId);
  }

  @Get('live-scores')
  getLiveScores(@CurrentUser() user: SessionUser) {
    return this.dashboardService.getLiveScores(user.organizationId);
  }

  @Roles(Role.ADMIN, Role.COMMISSION, Role.OBSERVATEUR)
  @Get('recent-activity')
  getRecentActivity(
    @CurrentUser() user: SessionUser,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getRecentActivity(
      user.organizationId,
      limit ? parseInt(limit) : 10,
    );
  }
}
