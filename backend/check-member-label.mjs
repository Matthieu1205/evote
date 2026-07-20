import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquant (voir backend/.env).');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const r = await client.query('SELECT slug, "memberLabel" FROM "Organization"');
console.log(JSON.stringify(r.rows, null, 2));
await client.end();
