import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Roles(Role.ADMIN, Role.COMMISSION, Role.OBSERVATEUR)
  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  @Roles(Role.ADMIN, Role.COMMISSION, Role.OBSERVATEUR)
  @Get('charts')
  getCharts() {
    return this.dashboardService.getCharts();
  }

  @Get('live-scores')
  getLiveScores() {
    return this.dashboardService.getLiveScores();
  }

  @Roles(Role.ADMIN, Role.COMMISSION, Role.OBSERVATEUR)
  @Get('recent-activity')
  getRecentActivity(@Query('limit') limit?: string) {
    return this.dashboardService.getRecentActivity(
      limit ? parseInt(limit) : 10,
    );
  }
}
