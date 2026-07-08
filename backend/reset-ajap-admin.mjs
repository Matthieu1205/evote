import { hash } from '@node-rs/argon2';
import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = 'postgresql://neondb_owner:npg_txew7iIKAWL0@ep-cool-bar-atw75nn9.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const NEW_PASSWORD = 'Admin2026';
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();

// Trouver l'admin de l'org ajap
const find = await client.query(
  `SELECT u.id, u."ordreNumber", u.email, u.role, o.slug
   FROM "User" u
   JOIN "Organization" o ON o.id = u."organizationId"
   WHERE o.slug = 'ajap' AND u.role = 'ADMIN'`
);

if (find.rows.length === 0) {
  console.log('❌ Aucun ADMIN trouvé pour l\'org ajap');
  await client.end();
  process.exit(1);
}

console.log('Admins trouvés dans ajap :', find.rows.map(r => ({ ordreNumber: r.ordreNumber, email: r.email })));

const newHash = await hash(NEW_PASSWORD, OPTS);
const res = await client.query(
  `UPDATE "User" SET "passwordHash" = $1
   WHERE "organizationId" = (SELECT id FROM "Organization" WHERE slug = 'ajap')
   AND role = 'ADMIN'
   RETURNING "ordreNumber", email, role`,
  [newHash]
);

console.log('\n✅ Mot de passe réinitialisé pour :', res.rows);
console.log('\nIdentifiants de connexion :');
for (const row of res.rows) {
  console.log(`  Organisation : ajap`);
  console.log(`  Numéro      : ${row.ordreNumber}`);
  console.log(`  Mot de passe: ${NEW_PASSWORD}`);
  console.log('');
}

await client.end();
