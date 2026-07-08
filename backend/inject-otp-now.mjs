/**
 * Script d'injection OTP temporaire — utilise @node-rs/argon2 exactement
 * comme le backend pour garantir la compatibilité du hash.
 *
 * Usage: node inject-otp-now.mjs
 *   DATABASE_URL doit être défini en variable d'environnement ou modifié ci-dessous.
 */

import { hash } from '@node-rs/argon2';
import pg from 'pg';

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_txew7iIKAWL0@ep-cool-bar-atw75nn9.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Même paramètres que password.service.ts
const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const CODE = '512837'; // code OTP à injecter
const TTL_MS = 30 * 60 * 1000; // 30 minutes

async function main() {
  console.log('Connexion à la base de données...');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. Trouver le SUPER_ADMIN
    const userRes = await client.query(
      `SELECT u.id, u.email, u."firstName", u."lastName"
       FROM "User" u
       JOIN "Organization" o ON o.id = u."organizationId"
       WHERE u.role = 'SUPER_ADMIN' AND o."isPlatform" = true
       LIMIT 1`
    );

    if (userRes.rows.length === 0) {
      throw new Error('Aucun SUPER_ADMIN trouvé dans la base de données.');
    }

    const user = userRes.rows[0];
    console.log(`SUPER_ADMIN trouvé : ${user.email} (id=${user.id})`);

    // 2. Invalider tous les OTP LOGIN non consommés pour cet utilisateur
    const invalidated = await client.query(
      `UPDATE "Otp"
       SET consumed = true
       WHERE "userId" = $1 AND purpose = 'LOGIN' AND consumed = false`,
      [user.id]
    );
    console.log(`${invalidated.rowCount} OTP(s) précédent(s) invalidé(s).`);

    // 3. Hacher le code avec les mêmes paramètres que le backend
    console.log(`Hachage du code ${CODE} avec argon2id...`);
    const codeHash = await hash(CODE, ARGON2_OPTS);
    console.log(`Hash généré : ${codeHash.slice(0, 40)}...`);

    // 4. Insérer le nouvel OTP
    const expiresAt = new Date(Date.now() + TTL_MS);
    await client.query(
      `INSERT INTO "Otp" (id, "userId", purpose, "codeHash", "expiresAt", consumed, attempts, "createdAt")
       VALUES (gen_random_uuid(), $1, 'LOGIN', $2, $3, false, 0, NOW())`,
      [user.id, codeHash, expiresAt]
    );

    console.log(`\n✅ OTP injecté avec succès !`);
    console.log(`   Code à entrer : ${CODE}`);
    console.log(`   Valide jusqu'à : ${expiresAt.toISOString()}`);
    console.log(`\n⚠️  Entre ce code MAINTENANT dans le champ OTP, puis clique "Se connecter".`);
    console.log(`   Ne clique PAS sur "Recevoir le code OTP" — ça invaliderait ce code.`);

  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
