import 'dotenv/config';
import { hash, verify } from '@node-rs/argon2';
import pg from 'pg';
const { Client } = pg;

const NEW_PASSWORD = process.argv[2];
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquant (voir backend/.env).');
  process.exit(1);
}
if (!NEW_PASSWORD) {
  console.error('Usage : node change-password.mjs <nouveau-mot-de-passe>');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const newHash = await hash(NEW_PASSWORD, OPTS);

const res = await client.query(
  `UPDATE "User" SET "passwordHash" = $1
   WHERE id = (
     SELECT u.id FROM "User" u
     JOIN "Organization" o ON o.id = u."organizationId"
     WHERE u.role = 'SUPER_ADMIN' AND o."isPlatform" = true
     LIMIT 1
   )
   RETURNING email`,
  [newHash]
);
console.log('Mot de passe changé pour :', res.rows[0]?.email);
console.log('Nouveau mot de passe :', NEW_PASSWORD);

// Verify it works
const check = await client.query(
  `SELECT "passwordHash" FROM "User" WHERE id = (
     SELECT u.id FROM "User" u
     JOIN "Organization" o ON o.id = u."organizationId"
     WHERE u.role = 'SUPER_ADMIN' AND o."isPlatform" = true
     LIMIT 1
   )`
);
const ok = await verify(check.rows[0].passwordHash, NEW_PASSWORD);
console.log('Vérification :', ok ? '✅ VALIDE' : '❌ INVALIDE');

await client.end();
