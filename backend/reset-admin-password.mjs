import 'dotenv/config';
import { hash, verify } from '@node-rs/argon2';
import pkg from 'pg';
const { Client } = pkg;

const NEW_PASSWORD = process.argv[2];
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquant (voir backend/.env).');
  process.exit(1);
}
if (!NEW_PASSWORD) {
  console.error('Usage : node reset-admin-password.mjs <nouveau-mot-de-passe>');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const newHash = await hash(NEW_PASSWORD, OPTS);

// Reset ADMIN of ordre-pharmaciens
const res = await client.query(
  `UPDATE "User" SET "passwordHash" = $1
   WHERE "ordreNumber" = 'ADMIN-001'
   AND "organizationId" = (SELECT id FROM "Organization" WHERE slug = 'ordre-pharmaciens')
   RETURNING email, "ordreNumber", role`,
  [newHash]
);
console.log('Mot de passe changé pour :', res.rows);

// Also reset SUPER_ADMIN
const res2 = await client.query(
  `UPDATE "User" SET "passwordHash" = $1
   WHERE "ordreNumber" = 'SUPER-ADMIN'
   AND "organizationId" = (SELECT id FROM "Organization" WHERE slug = 'platform')
   RETURNING email, "ordreNumber", role`,
  [newHash]
);
console.log('Mot de passe changé pour :', res2.rows);

// Verify both
const check = await client.query(
  `SELECT u."passwordHash", u."ordreNumber", u.role FROM "User" u
   JOIN "Organization" o ON o.id = u."organizationId"
   WHERE u.role IN ('ADMIN','SUPER_ADMIN')`
);
for (const row of check.rows) {
  const ok = await verify(row.passwordHash, NEW_PASSWORD);
  console.log(`${row.role} (${row.ordreNumber}): ${ok ? '✅ VALIDE' : '❌ INVALIDE'}`);
}

await client.end();
