import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquant (voir backend/.env).');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const orgs = await client.query('SELECT id, slug, name, "isPlatform" FROM "Organization"');
console.log('=== Organisations ===');
orgs.rows.forEach(r => console.log(r));

const admins = await client.query(`SELECT u.email, u."ordreNumber", u.role, u.status, o.slug FROM "User" u JOIN "Organization" o ON o.id = u."organizationId" WHERE u.role IN ('ADMIN','SUPER_ADMIN')`);
console.log('\n=== Admins/Super-admins ===');
admins.rows.forEach(r => console.log(r));

await client.end();
