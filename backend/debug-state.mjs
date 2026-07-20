import 'dotenv/config';
import { verify } from '@node-rs/argon2';
import pg from 'pg';
const { Client } = pg;

const testPassword = process.argv[2];
const testOtp = process.argv[3];

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquant (voir backend/.env).');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const u = await client.query(`
  SELECT u.id, u.status, u."ordreNumber", u."passwordHash", o.slug, o."isPlatform"
  FROM "User" u JOIN "Organization" o ON o.id = u."organizationId"
  WHERE u.role = 'SUPER_ADMIN' AND o."isPlatform" = true LIMIT 1
`);
const user = u.rows[0];
console.log('Status:', user.status);
console.log('OrdreNumber:', user.ordreNumber);
console.log('Org slug:', user.slug);

if (testPassword) {
  const pwdOk = await verify(user.passwordHash, testPassword);
  console.log(`Mot de passe fourni => ${pwdOk ? '✅ VALIDE' : '❌ INVALIDE'}`);
} else {
  console.log('(passe le mot de passe à tester en argument : node debug-state.mjs <password> [otp])');
}

const otp = await client.query(`
  SELECT id, consumed, attempts, "expiresAt", "codeHash"
  FROM "Otp" WHERE "userId" = $1 AND consumed = false AND purpose = 'LOGIN'
  ORDER BY "createdAt" DESC LIMIT 1
`, [user.id]);

if (otp.rows[0]) {
  const r = otp.rows[0];
  const expired = r.expiresAt < new Date();
  console.log(`OTP: attempts=${r.attempts} expired=${expired}`);
  if (testOtp) {
    const otpOk = await verify(r.codeHash, testOtp);
    console.log(`OTP fourni => ${otpOk ? '✅ VALIDE' : '❌ INVALIDE'}`);
  }
} else {
  console.log('Aucun OTP actif');
}

await client.end();
