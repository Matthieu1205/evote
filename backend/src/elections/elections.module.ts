import { Module } from '@nestjs/common';
import { ElectionsService } from './elections.service';
import { ElectionsController } from './elections.controller';
import { ElectionsScheduler } from './elections.scheduler';
import { TallyModule } from '../tally/tally.module';

@Module({
  imports: [TallyModule],
  controllers: [ElectionsController],
  providers: [ElectionsService, ElectionsScheduler],
  exports: [ElectionsService],
})
export class ElectionsModule {}
