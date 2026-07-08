import { hash, verify } from '@node-rs/argon2';
import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgresql://neondb_owner:npg_txew7iIKAWL0@ep-cool-bar-atw75nn9.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const NEW_PASSWORD = 'SuperAdmin2026';
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

const client = new Client({ connectionString: DATABASE_URL });
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
