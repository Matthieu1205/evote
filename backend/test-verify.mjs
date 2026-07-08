/**
 * Teste localement si le hash argon2 de l'OTP actif peut être vérifié,
 * et si le mot de passe SUPER_ADMIN peut être vérifié aussi.
 */
import { hash, verify } from '@node-rs/argon2';
import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_txew7iIKAWL0@ep-cool-bar-atw75nn9.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();

// Récupérer le SUPER_ADMIN et son OTP actif
const userRes = await client.query(
  `SELECT u.id, u."passwordHash", u.email FROM "User" u
   JOIN "Organization" o ON o.id = u."organizationId"
   WHERE u.role = 'SUPER_ADMIN' AND o."isPlatform" = true LIMIT 1`
);
const user = userRes.rows[0];

const otpRes = await client.query(
  `SELECT "codeHash", "expiresAt", consumed, attempts
   FROM "Otp" WHERE "userId" = $1 AND consumed = false AND purpose = 'LOGIN'
   ORDER BY "createdAt" DESC LIMIT 1`,
  [user.id]
);
const otp = otpRes.rows[0];

console.log('--- Test de vérification OTP ---');
console.log('OTP actif :', otp ? `expiresAt=${otp.expiresAt.toISOString()} attempts=${otp.attempts}` : 'AUCUN');

if (otp) {
  const otpOk = await verify(otp.codeHash, '512837');
  console.log('verify("512837") =>', otpOk ? '✅ VALIDE' : '❌ INVALIDE');
}

console.log('\n--- Test mot de passe ---');
console.log('Entrez votre mot de passe SUPER_ADMIN pour le tester:');
// On va tester avec le mot de passe typique. Remplacer ici si besoin.
// Pour le test: si vous avez défini un mot de passe lors du backfill, c'est celui-là.
// Le script va afficher si le hash en DB est vérifiable.
console.log('Hash en DB (50 premiers chars):', user.passwordHash.slice(0, 60));

await client.end();
