#!/usr/bin/env node
/**
 * scripts/sync-all-broken-media.mjs
 *
 * Generalises sync-media-paths-to-prod.mjs. For every media row whose
 * prod-side `filename` doesn't actually exist in the shared Supabase
 * bucket, copies the file/size columns from local (which was used as
 * the source of truth when regenerate-media-sizes was run and which
 * always points at currently-existing files).
 *
 * Each row's existence is verified with a public HEAD request — no S3
 * credentials needed.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   node scripts/sync-all-broken-media.mjs                # dry-run
 *   node scripts/sync-all-broken-media.mjs --execute     # write to prod
 *
 * Idempotent. Prints a per-row decision so you can sanity-check.
 */
import pg from 'pg';

const EXECUTE = process.argv.includes('--execute');

const SUPABASE_BASE =
  'https://unakyuksioglmihvipmi.supabase.co/storage/v1/object/public/hpm-media/media/';

const SIZE_KEYS = ['thumbnail', 'card', 'feature', 'hero', 'large'];

const COLS = [
  'filename',
  'mime_type',
  'filesize',
  'width',
  'height',
  ...SIZE_KEYS.flatMap((s) => [
    `sizes_${s}_filename`,
    `sizes_${s}_mime_type`,
    `sizes_${s}_filesize`,
    `sizes_${s}_width`,
    `sizes_${s}_height`,
  ]),
];

const localUrl = process.env.DATABASE_URL;
const prodUrl = process.env.DATABASE_URL_PROD;
if (!localUrl || !prodUrl) {
  console.error('DATABASE_URL and DATABASE_URL_PROD must be set');
  process.exit(1);
}
if (localUrl === prodUrl) {
  console.error('DATABASE_URL and DATABASE_URL_PROD are identical — refusing');
  process.exit(1);
}

const local = new pg.Client({ connectionString: localUrl });
const prod = new pg.Client({ connectionString: prodUrl, ssl: { rejectUnauthorized: false } });
await local.connect();
await prod.connect();

console.log(EXECUTE ? '[execute] writing fixes to prod\n' : '[dry-run] no writes — pass --execute\n');

async function exists(filename) {
  if (!filename) return false;
  try {
    const r = await fetch(SUPABASE_BASE + filename, { method: 'HEAD' });
    return r.ok;
  } catch {
    return false;
  }
}

let inSync = 0;
let updated = 0;
let unfixable = 0;
let prodOnly = 0;

try {
  // Pull every prod row with the columns we care about, joined with the same row in local.
  const prodRes = await prod.query(`SELECT id, filename FROM media ORDER BY id`);
  console.log(`Total prod media rows: ${prodRes.rowCount}\n`);

  for (const { id, filename: prodName } of prodRes.rows) {
    if (!prodName) {
      console.log(`  [no-filename] id=${id}`);
      unfixable++;
      continue;
    }

    if (await exists(prodName)) {
      inSync++;
      continue;
    }

    // Prod's filename doesn't resolve. Look in local.
    const localR = await local.query(
      `SELECT ${COLS.join(', ')} FROM media WHERE id = $1`,
      [id],
    );
    if (localR.rowCount === 0) {
      console.log(`  [prod-only] id=${id} ${prodName} (broken; not in local)`);
      prodOnly++;
      unfixable++;
      continue;
    }
    const localRow = localR.rows[0];
    if (!localRow.filename) {
      console.log(`  [no-local-filename] id=${id}`);
      unfixable++;
      continue;
    }
    if (!(await exists(localRow.filename))) {
      console.log(`  [both-broken] id=${id} prod="${prodName}" local="${localRow.filename}"`);
      unfixable++;
      continue;
    }

    console.log(`  [fix] id=${id}: ${prodName} → ${localRow.filename}`);

    if (EXECUTE) {
      const setClauses = COLS.map((c, i) => `${c} = $${i + 2}`).join(', ');
      const values = [id, ...COLS.map((c) => localRow[c])];
      await prod.query(
        `UPDATE media SET ${setClauses}, updated_at = now() WHERE id = $1`,
        values,
      );
    }
    updated++;
  }

  console.log(
    `\nDone — ${updated} ${EXECUTE ? 'updated' : 'would update'}, ${inSync} already in sync, ${unfixable} unfixable (${prodOnly} prod-only).`,
  );
} finally {
  await local.end();
  await prod.end();
}

process.exit(unfixable > 0 ? 1 : 0);
