import { verify } from '@node-rs/argon2';
import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_txew7iIKAWL0@ep-cool-bar-atw75nn9.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });
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

// Tester le mot de passe
const pwdOk = await verify(user.passwordHash, 'Admin@2026!');
console.log('Password "Admin@2026!" =>', pwdOk ? '✅ VALIDE' : '❌ INVALIDE');

// Tester l OTP actif
const otp = await client.query(`
  SELECT id, consumed, attempts, "expiresAt", "codeHash"
  FROM "Otp" WHERE "userId" = $1 AND consumed = false AND purpose = 'LOGIN'
  ORDER BY "createdAt" DESC LIMIT 1
`, [user.id]);

if (otp.rows[0]) {
  const r = otp.rows[0];
  const expired = r.expiresAt < new Date();
  const otpOk = await verify(r.codeHash, '512837');
  console.log(`OTP: attempts=${r.attempts} expired=${expired}`);
  console.log('OTP "512837" =>', otpOk ? '✅ VALIDE' : '❌ INVALIDE');
} else {
  console.log('Aucun OTP actif');
}

await client.end();
