import { IsNotEmpty, IsString } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  organizationSlug: string;

  @IsString()
  @IsNotEmpty()
  ordreNumber: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
