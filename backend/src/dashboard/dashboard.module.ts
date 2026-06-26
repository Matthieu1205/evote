import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { TallyModule } from '../tally/tally.module';

@Module({
  imports: [TallyModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
