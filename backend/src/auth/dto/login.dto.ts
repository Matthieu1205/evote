import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  organizationSlug: string;

  @IsString()
  @IsNotEmpty()
  ordreNumber: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  otp?: string;
}
