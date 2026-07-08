import pkg from 'pg';
const { Client } = pkg;

const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_txew7iIKAWL0@ep-cool-bar-atw75nn9.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });
await client.connect();

const res = await client.query(`
  UPDATE "Organization"
  SET "memberLabel" = 'Numéro de membre'
  WHERE "memberLabel" = 'Numéro d''inscription à l''Ordre'
  RETURNING slug, "memberLabel"
`);
console.log('Mis à jour :', res.rows);
await client.end();
