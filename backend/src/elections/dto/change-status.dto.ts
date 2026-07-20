import { IsEnum } from 'class-validator';
import { ElectionStatus } from '@prisma/client';

export class ChangeStatusDto {
  @IsEnum(ElectionStatus)
  status: ElectionStatus;
}
