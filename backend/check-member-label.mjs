import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_txew7iIKAWL0@ep-cool-bar-atw75nn9.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });
await client.connect();
const r = await client.query('SELECT slug, "memberLabel" FROM "Organization"');
console.log(JSON.stringify(r.rows, null, 2));
await client.end();
