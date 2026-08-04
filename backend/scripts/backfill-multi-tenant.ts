/**
 * Backfill one-off : convertit les données existantes (mono-tenant) en
 * premier tenant réel "Ordre des Pharmaciens" et crée l'organisation
 * plateforme + un premier compte SUPER_ADMIN.
 *
 * À exécuter manuellement contre DATABASE_URL (jamais en déploiement
 * automatisé), entre le "Deploy A" (organizationId nullable) et le
 * "Deploy B" (organizationId NOT NULL + contraintes composées).
 * Idempotent : peut être relancé sans dupliquer les données.
 *
 * Usage : SUPER_ADMIN_EMAIL=... npx ts-node scripts/backfill-multi-tenant.ts
 */
import 'dotenv/config';
import { Client } from 'pg';
import { hash } from '@node-rs/argon2';
import * as crypto from 'crypto';

const ARGON2_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

const PHARMA_ORG_SLUG = 'ordre-pharmaciens';
const PHARMA_ORG_NAME = 'Ordre des Pharmaciens';
const PHARMA_MEMBER_LABEL = "Numéro d'inscription à l'Ordre";
const PHARMA_PRIMARY_COLOR = '#059669';

const PLATFORM_ORG_SLUG = 'platform';
const PLATFORM_ORG_NAME = 'Plateforme eVote';

const TENANT_TABLES = [
  'User',
  'Election',
  'Position',
  'Candidacy',
  'Ballot',
  'VoteRecord',
] as const;

function randomPassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let pwd = '';
  for (let i = 0; i < length; i++) pwd += chars[bytes[i] % chars.length];
  return pwd;
}

async function getOrCreateOrganization(
  client: Client,
  params: {
    slug: string;
    name: string;
    memberLabel?: string;
    primaryColor?: string;
    isPlatform: boolean;
  },
): Promise<string> {
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM "Organization" WHERE slug = $1`,
    [params.slug],
  );
  if (existing.rows.length > 0) {
    console.log(`[skip] Organisation "${params.slug}" existe déjà.`);
    return existing.rows[0].id;
  }

  const id = crypto.randomUUID();
  await client.query(
    `INSERT INTO "Organization"
       (id, slug, name, "memberLabel", "primaryColor", "isPlatform", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, now(), now())`,
    [
      id,
      params.slug,
      params.name,
      params.memberLabel ?? "Numéro d'inscription à l'Ordre",
      params.primaryColor ?? null,
      params.isPlatform,
    ],
  );
  console.log(`[create] Organisation "${params.slug}" créée (id=${id}).`);
  return id;
}

async function backfillTenantTables(client: Client, organizationId: string) {
  for (const table of TENANT_TABLES) {
    const result = await client.query(
      `UPDATE "${table}" SET "organizationId" = $1 WHERE "organizationId" IS NULL`,
      [organizationId],
    );
    console.log(`[backfill] "${table}": ${result.rowCount} ligne(s) mise(s) à jour.`);
  }

  // AuditLog.organizationId reste nullable (logs plateforme) : on ne
  // rattache que les logs déjà liés à un acteur de ce tenant.
  const auditResult = await client.query(
    `UPDATE "AuditLog" a
       SET "organizationId" = $1
     WHERE a."organizationId" IS NULL
       AND a."actorId" IN (SELECT id FROM "User" WHERE "organizationId" = $1)`,
    [organizationId],
  );
  console.log(
    `[backfill] "AuditLog": ${auditResult.rowCount} ligne(s) mise(s) à jour.`,
  );
}

async function assertNoRemainingNulls(client: Client) {
  for (const table of TENANT_TABLES) {
    const result = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM "${table}" WHERE "organizationId" IS NULL`,
    );
    const remaining = Number(result.rows[0].count);
    if (remaining > 0) {
      throw new Error(
        `Échec backfill : ${remaining} ligne(s) "${table}" ont encore organizationId = NULL.`,
      );
    }
  }
}

async function getOrCreateSuperAdmin(
  client: Client,
  platformOrgId: string,
): Promise<void> {
  const email = process.env.SUPER_ADMIN_EMAIL;
  if (!email) {
    console.warn(
      '[skip] SUPER_ADMIN_EMAIL non défini : aucun compte SUPER_ADMIN créé.',
    );
    return;
  }
  const ordreNumber = process.env.SUPER_ADMIN_ORDRE_NUMBER ?? 'SUPER-ADMIN';

  const existing = await client.query(
    `SELECT id FROM "User" WHERE "organizationId" = $1 AND (email = $2 OR "ordreNumber" = $3)`,
    [platformOrgId, email, ordreNumber],
  );
  if (existing.rows.length > 0) {
    console.log('[skip] Un compte SUPER_ADMIN existe déjà dans le tenant plateforme.');
    return;
  }

  const tempPassword = randomPassword(16);
  const passwordHash = await hash(tempPassword, ARGON2_OPTS);
  const id = crypto.randomUUID();

  await client.query(
    `INSERT INTO "User"
       (id, "organizationId", "ordreNumber", email, "firstName", "lastName",
        "passwordHash", role, status, "isEligible", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUPER_ADMIN', 'ACTIF', false, now(), now())`,
    [id, platformOrgId, ordreNumber, email, 'Super', 'Admin', passwordHash],
  );

  console.log('========================================================');
  console.log('Compte SUPER_ADMIN créé :');
  console.log(`  organisation (slug) : ${PLATFORM_ORG_SLUG}`);
  console.log(`  numéro d'inscription : ${ordreNumber}`);
  console.log(`  email                : ${email}`);
  console.log(`  mot de passe temp.   : ${tempPassword}`);
  console.log('  (à conserver maintenant, il ne sera plus jamais affiché)');
  console.log('========================================================');
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL manquant.');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('BEGIN');

    const platformOrgId = await getOrCreateOrganization(client, {
      slug: PLATFORM_ORG_SLUG,
      name: PLATFORM_ORG_NAME,
      isPlatform: true,
    });

    const pharmaOrgId = await getOrCreateOrganization(client, {
      slug: PHARMA_ORG_SLUG,
      name: PHARMA_ORG_NAME,
      memberLabel: PHARMA_MEMBER_LABEL,
      primaryColor: PHARMA_PRIMARY_COLOR,
      isPlatform: false,
    });

    await backfillTenantTables(client, pharmaOrgId);
    await assertNoRemainingNulls(client);
    await getOrCreateSuperAdmin(client, platformOrgId);

    await client.query('COMMIT');
    console.log('Backfill terminé avec succès.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Backfill annulé (ROLLBACK) :', e);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
