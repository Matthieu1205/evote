import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

// Chiffrement des bulletins de vote en AES-256-GCM (cahier des charges §9).
// La clé provient de BALLOT_ENCRYPTION_KEY (hex, 32 octets = 64 caractères).

const ALGO = 'aes-256-gcm';

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

@Injectable()
export class CryptoService {
  private getKey(): Buffer {
    const hex = process.env.BALLOT_ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
      throw new Error(
        'BALLOT_ENCRYPTION_KEY manquante ou invalide (64 caractères hexadécimaux attendus).',
      );
    }
    return Buffer.from(hex, 'hex');
  }

  encryptBallot(plain: object): EncryptedPayload {
    const key = this.getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const data = Buffer.concat([
      cipher.update(JSON.stringify(plain), 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return {
      ciphertext: data.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  decryptBallot<T = unknown>(payload: EncryptedPayload): T {
    const key = this.getKey();
    const decipher = crypto.createDecipheriv(
      ALGO,
      key,
      Buffer.from(payload.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
    const data = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(data.toString('utf8')) as T;
  }

  sha256(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  randomNumericCode(length = 6): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += crypto.randomInt(0, 10).toString();
    }
    return code;
  }

  randomPassword(length = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = crypto.randomBytes(length);
    let pwd = '';
    for (let i = 0; i < length; i++) {
      pwd += chars[bytes[i] % chars.length];
    }
    return pwd;
  }
}
