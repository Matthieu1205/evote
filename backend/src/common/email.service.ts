import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private createTransporter() {
    const host = process.env.SMTP_HOST?.trim();
    const port = parseInt(process.env.SMTP_PORT?.trim() ?? '587', 10);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim().replace(/\s+/g, '');

    if (!host || !user || !pass) {
      throw new Error(
        'Configuration SMTP manquante : définissez SMTP_HOST, SMTP_USER et SMTP_PASS.',
      );
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  private buildFrom(): string {
    const raw = (process.env.SMTP_FROM ?? process.env.SMTP_USER ?? '').trim();
    // Si SMTP_FROM contient déjà un display name ("Name <email>"), l'utiliser tel quel
    return raw.includes('<') ? raw : `"eVote" <${raw}>`;
  }

  async sendOtpEmail(
    to: string,
    recipientName: string,
    code: string,
    purpose: 'LOGIN' | 'VOTE',
  ): Promise<void> {
    const from = this.buildFrom();
    const transporter = this.createTransporter();
    const label =
      purpose === 'LOGIN' ? 'connexion à votre espace' : 'confirmation de vote';

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px 0;">
  <div style="max-width:480px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
    <div style="background:#1a3a5c;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Ordre des Pharmaciens — eVote</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;">Bonjour <strong>${recipientName}</strong>,</p>
      <p style="margin:0 0 24px;">Voici votre code de ${label} :</p>
      <div style="background:#f0f4ff;border:2px solid #1a3a5c;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
        <span style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#1a3a5c;">${code}</span>
      </div>
      <p style="margin:0 0 8px;color:#666;font-size:14px;">Ce code est valable <strong>5 minutes</strong> et à usage unique.</p>
      <p style="margin:0;color:#666;font-size:14px;">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
    </div>
    <div style="background:#f8f8f8;padding:16px 32px;border-top:1px solid #eee;">
      <p style="margin:0;color:#999;font-size:12px;">Ce message est automatique, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from,
      to,
      subject: `Votre code de ${label} — ${code}`,
      html,
      text: `Bonjour ${recipientName},\n\nVotre code de ${label} : ${code}\n\nValable 5 minutes, usage unique.`,
    });
  }

  async sendWelcomeEmail(
    to: string,
    recipientName: string,
    ordreNumber: string,
    tempPassword: string,
  ): Promise<void> {
    const from = this.buildFrom();
    const transporter = this.createTransporter();
    const appUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px 0;">
  <div style="max-width:480px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
    <div style="background:#1a3a5c;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Ordre des Pharmaciens — eVote</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;">Bonjour <strong>${recipientName}</strong>,</p>
      <p style="margin:0 0 16px;">Votre compte sur la plateforme de vote électronique a été créé.</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tr>
          <td style="padding:8px 12px;background:#f0f4ff;border:1px solid #dde5f0;font-weight:bold;width:40%;">Numéro d'ordre</td>
          <td style="padding:8px 12px;border:1px solid #dde5f0;">${ordreNumber}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#f0f4ff;border:1px solid #dde5f0;font-weight:bold;">Mot de passe</td>
          <td style="padding:8px 12px;border:1px solid #dde5f0;font-family:monospace;font-size:16px;">${tempPassword}</td>
        </tr>
      </table>
      <p style="margin:0 0 24px;color:#e53e3e;font-size:14px;"><strong>Changez votre mot de passe dès la première connexion.</strong></p>
      <a href="${appUrl}/login" style="display:inline-block;background:#1a3a5c;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Se connecter</a>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from,
      to,
      subject: 'Bienvenue sur eVote — vos identifiants de connexion',
      html,
      text: `Bonjour ${recipientName},\n\nVotre compte eVote a été créé.\nNuméro d'ordre : ${ordreNumber}\nMot de passe : ${tempPassword}\n\nChangez votre mot de passe dès la première connexion.\n\n${appUrl}/login`,
    });
  }

  async sendCandidacyStatusEmail(
    to: string,
    recipientName: string,
    positionTitle: string,
    status: 'VALIDEE' | 'REJETEE',
    reviewNote?: string | null,
  ): Promise<void> {
    const from = this.buildFrom();
    const transporter = this.createTransporter();
    const isValid = status === 'VALIDEE';
    const subject = isValid
      ? 'Votre candidature a été validée — eVote'
      : "Votre candidature n'a pas été retenue — eVote";

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px 0;">
  <div style="max-width:480px;margin:auto;background:#fff;border-radius:8px;">
    <div style="background:#1a3a5c;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Ordre des Pharmaciens — eVote</h1>
    </div>
    <div style="padding:32px;">
      <p>Bonjour <strong>${recipientName}</strong>,</p>
      <p>Votre candidature au poste de <strong>${positionTitle}</strong> a été ${isValid ? 'validée' : 'rejetée'} par la commission électorale.</p>
      ${reviewNote ? `<p><em>Motif : ${reviewNote}</em></p>` : ''}
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
  }
}
