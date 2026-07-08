import { IsString, MinLength, IsOptional, IsInt, Min } from 'class-validator';

export class CreateConditionDto {
  @IsString()
  @MinLength(3)
  text!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateConditionDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  text?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
