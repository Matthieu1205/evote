import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_txew7iIKAWL0@ep-cool-bar-atw75nn9.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();

// Prolonger l'expiration du dernier OTP non consommé du SUPER_ADMIN
const newExpiry = new Date(Date.now() + 20 * 60 * 1000); // +20 minutes

const res = await client.query(
  `UPDATE "Otp"
   SET "expiresAt" = $1
   WHERE id = '57789f39-68a7-48dd-9d6f-01e1b0aac019'
   RETURNING id, "expiresAt", consumed, attempts`,
  [newExpiry]
);

if (res.rowCount === 0) {
  console.error('OTP introuvable avec cet id exact, tentative par userId...');
  // fallback: prendre le plus récent non consommé
  const userRes = await client.query(
    `SELECT u.id FROM "User" u JOIN "Organization" o ON o.id = u."organizationId"
     WHERE u.role = 'SUPER_ADMIN' AND o."isPlatform" = true LIMIT 1`
  );
  const userId = userRes.rows[0]?.id;
  const res2 = await client.query(
    `UPDATE "Otp" SET "expiresAt" = $1
     WHERE "userId" = $2 AND consumed = false AND purpose = 'LOGIN'
     RETURNING id, "expiresAt", consumed, attempts`,
    [newExpiry, userId]
  );
  console.log('Mis à jour par userId :', res2.rows);
} else {
  console.log('✅ Expiration prolongée avec succès !');
  console.log('   Code : 512837');
  console.log('   Nouveau expiresAt :', res.rows[0].expiresAt.toISOString());
  console.log('   Valide pendant 20 minutes depuis maintenant.');
}

await client.end();
