import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { CryptoService } from '../crypto/crypto.service';
import { EmailService } from './email.service';
import type { OtpPurpose } from '@prisma/client';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private password: PasswordService,
    private crypto: CryptoService,
    private email: EmailService,
  ) {}

  async issueOtp(
    userId: string,
    purpose: OtpPurpose,
    context?: string,
  ): Promise<{ code: string }> {
    // Invalide les OTP précédents non consommés pour ce but.
    await this.prisma.otp.updateMany({
      where: { userId, purpose, consumed: false },
      data: { consumed: true },
    });

    const code = this.crypto.randomNumericCode(6);
    const codeHash = await this.password.hashPassword(code);

    await this.prisma.otp.create({
      data: {
        userId,
        purpose,
        context,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    const delivery = process.env.OTP_DELIVERY ?? 'console';

    if (delivery === 'email') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (!user) throw new Error(`Utilisateur introuvable : ${userId}`);
      const name = `${user.firstName} ${user.lastName}`;
      const recipient = process.env.OTP_OVERRIDE_EMAIL ?? user.email;
      const otpPurpose = purpose === 'LOGIN' ? 'LOGIN' : 'VOTE';
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[OTP DEV] ${purpose} → ${recipient} : ${code}`);
      }
      try {
        await this.email.sendOtpEmail(recipient, name, code, otpPurpose);
      } catch (err) {
        console.error(
          `[OTP] Échec envoi email à ${recipient} :`,
          (err as Error).message,
        );
        // En dev, le code est déjà loggé ci-dessus — la connexion peut continuer
        if (process.env.NODE_ENV === 'production') throw err;
      }
    } else {
      console.log(`[OTP] ${purpose} pour ${userId} : ${code}`);
    }

    return { code };
  }

  async verifyOtp(
    userId: string,
    purpose: OtpPurpose,
    code: string,
    context?: string,
  ): Promise<boolean> {
    const otp = await this.prisma.otp.findFirst({
      where: {
        userId,
        purpose,
        consumed: false,
        context: context ?? undefined,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) return false;
    if (otp.expiresAt < new Date()) return false;
    if (otp.attempts >= MAX_ATTEMPTS) return false;

    const valid = await this.password.verifyPassword(otp.codeHash, code);

    if (!valid) {
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    await this.prisma.otp.update({
      where: { id: otp.id },
      data: { consumed: true },
    });
    return true;
  }
}
