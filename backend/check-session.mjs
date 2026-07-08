import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_txew7iIKAWL0@ep-cool-bar-atw75nn9.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({ connectionString: DATABASE_URL });
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
