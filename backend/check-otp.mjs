import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquant (voir backend/.env).');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// SUPER_ADMIN user
const userRes = await client.query(
  `SELECT u.id, u.email FROM "User" u
   JOIN "Organization" o ON o.id = u."organizationId"
   WHERE u.role = 'SUPER_ADMIN' AND o."isPlatform" = true LIMIT 1`
);
const user = userRes.rows[0];
console.log('SUPER_ADMIN:', user?.email, 'id=', user?.id);

// All OTP records for this user
const otpRes = await client.query(
  `SELECT id, purpose, consumed, attempts, "expiresAt", "createdAt",
          LEFT("codeHash", 50) as hash_preview
   FROM "Otp" WHERE "userId" = $1
   ORDER BY "createdAt" DESC LIMIT 10`,
  [user?.id]
);
console.log('\nOTP records (most recent first):');
for (const row of otpRes.rows) {
  const expired = row.expiresAt < new Date();
  console.log(
    `  id=${row.id.slice(0,8)}... purpose=${row.purpose} consumed=${row.consumed} attempts=${row.attempts} expired=${expired} expiresAt=${row.expiresAt.toISOString()} hash=${row.hash_preview}...`
  );
}

await client.end();
