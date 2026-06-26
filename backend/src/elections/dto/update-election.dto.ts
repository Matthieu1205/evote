import { PartialType } from '@nestjs/mapped-types';
import { CreateElectionDto } from './create-election.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ElectionStatus } from '@prisma/client';

export class UpdateElectionDto extends PartialType(CreateElectionDto) {
  @IsOptional()
  @IsEnum(ElectionStatus)
  status?: ElectionStatus;
}
