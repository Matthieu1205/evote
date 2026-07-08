import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_txew7iIKAWL0@ep-cool-bar-atw75nn9.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });
await client.connect();

const orgs = await client.query('SELECT id, slug, name, "isPlatform" FROM "Organization"');
console.log('=== Organisations ===');
orgs.rows.forEach(r => console.log(r));

const admins = await client.query(`SELECT u.email, u."ordreNumber", u.role, u.status, o.slug FROM "User" u JOIN "Organization" o ON o.id = u."organizationId" WHERE u.role IN ('ADMIN','SUPER_ADMIN')`);
console.log('\n=== Admins/Super-admins ===');
admins.rows.forEach(r => console.log(r));

await client.end();
