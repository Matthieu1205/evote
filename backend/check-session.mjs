import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquant (voir backend/.env).');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Check active sessions
const sessRes = await client.query(
  `SELECT sid, expire, sess->>'userId' as user_id
   FROM user_sessions
   WHERE expire > NOW()
   ORDER BY expire DESC LIMIT 5`
);
console.log('Sessions actives :', sessRes.rows.length);
for (const r of sessRes.rows) {
  console.log(`  sid=${r.sid.slice(0,16)}... userId=${r.user_id} expire=${r.expire}`);
}

// Check SUPER_ADMIN
const userRes = await client.query(
  `SELECT u.id, u.email, u.role FROM "User" u
   JOIN "Organization" o ON o.id = u."organizationId"
   WHERE u.role = 'SUPER_ADMIN' AND o."isPlatform" = true LIMIT 1`
);
console.log('\nSUPER_ADMIN:', userRes.rows[0]);

await client.end();
