import { Module } from '@nestjs/common';
import { CandidaciesService } from './candidacies.service';
import { CandidaciesController } from './candidacies.controller';

@Module({
  controllers: [CandidaciesController],
  providers: [CandidaciesService],
})
export class CandidaciesModule {}
