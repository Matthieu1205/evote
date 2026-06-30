import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateOrgAdminDto {
  @IsString()
  @IsNotEmpty()
  ordreNumber: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;
}
