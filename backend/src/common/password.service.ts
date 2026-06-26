import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

// Hachage des mots de passe avec Argon2id (cahier des charges §9).
const OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class PasswordService {
  hashPassword(plain: string): Promise<string> {
    return hash(plain, OPTS);
  }

  verifyPassword(hashed: string, plain: string): Promise<boolean> {
    return verify(hashed, plain);
  }
}
