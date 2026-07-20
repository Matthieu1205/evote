import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquant (voir backend/.env).');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const res = await client.query(`
  UPDATE "Organization"
  SET "memberLabel" = 'Numéro de membre'
  WHERE "memberLabel" = 'Numéro d''inscription à l''Ordre'
  RETURNING slug, "memberLabel"
`);
console.log('Mis à jour :', res.rows);
await client.end();
