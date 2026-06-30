import { IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  organizationSlug: string;

  @IsString()
  ordreNumber: string;
}
