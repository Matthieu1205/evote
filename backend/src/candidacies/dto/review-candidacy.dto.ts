import { IsOptional, IsString } from 'class-validator';

export class ReviewCandidacyDto {
  @IsOptional()
  @IsString()
  reviewNote?: string;
}
