import { Global, Module } from '@nestjs/common';
import { PasswordService } from './password.service';
import { AuditService } from './audit.service';
import { EmailService } from './email.service';
import { OtpService } from './otp.service';

@Global()
@Module({
  providers: [PasswordService, AuditService, EmailService, OtpService],
  exports: [PasswordService, AuditService, EmailService, OtpService],
})
export class CommonModule {}
