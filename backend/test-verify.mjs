/**
 * Teste localement si le hash argon2 de l'OTP actif peut être vérifié,
 * et si le mot de passe SUPER_ADMIN peut être vérifié aussi.
 *
 * Usage: node test-verify.mjs [code-otp] [mot-de-passe]
 */
import { verify } from '@node-rs/argon2';
import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquant (voir backend/.env).');
  process.exit(1);
}

const testOtpCode = process.argv[2];
const testPassword = process.argv[3];

const client = new Client({ connectionString: process.env.DATABASE_URL });
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

if (otp && testOtpCode) {
  const otpOk = await verify(otp.codeHash, testOtpCode);
  console.log(`verify("${testOtpCode}") =>`, otpOk ? '✅ VALIDE' : '❌ INVALIDE');
} else if (otp) {
  console.log('(passe un code OTP en 1er argument pour le tester)');
}

console.log('\n--- Test mot de passe ---');
if (testPassword) {
  const pwdOk = await verify(user.passwordHash, testPassword);
  console.log('Mot de passe fourni =>', pwdOk ? '✅ VALIDE' : '❌ INVALIDE');
} else {
  console.log('(passe un mot de passe en 2e argument pour le tester)');
}

await client.end();
