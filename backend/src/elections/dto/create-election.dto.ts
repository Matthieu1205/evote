import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MajorityRule } from '@prisma/client';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  seats?: number;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateElectionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MajorityRule)
  @IsOptional()
  majorityRule?: MajorityRule;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalRounds?: number;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsDateString()
  candidacyStartAt?: string;

  @IsOptional()
  @IsDateString()
  candidacyEndAt?: string;

  @IsOptional()
  @IsString()
  eligibleSection?: string;

  @IsOptional()
  positions?: CreatePositionDto[];
}
