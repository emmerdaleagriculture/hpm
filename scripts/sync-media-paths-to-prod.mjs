#!/usr/bin/env node
/**
 * scripts/sync-media-paths-to-prod.mjs
 *
 * One-off corrective: regenerate-media-sizes was run against the local DB,
 * which uses the SAME shared Supabase storage bucket as prod. Payload's
 * update-with-file deleted the old originals from storage and wrote new
 * '-1' files. Local DB pointed at the new names; prod DB still pointed
 * at the (now-deleted) original names → broken image URLs on prod.
 *
 * This script copies the file/size columns for the named IDs from local
 * to prod so prod DB matches reality.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   node scripts/sync-media-paths-to-prod.mjs            # dry-run
 *   node scripts/sync-media-paths-to-prod.mjs --execute  # write to prod
 */

import pg from 'pg';

const EXECUTE = process.argv.includes('--execute');

const IDS = [26, 33, 34, 48, 51, 130, 131, 148, 174];

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

console.log(EXECUTE ? '[execute] writing to prod\n' : '[dry-run] no writes\n');

let updated = 0;
let skipped = 0;
let missing = 0;

try {
  for (const id of IDS) {
    const localRes = await local.query(
      `SELECT ${COLS.join(', ')} FROM media WHERE id = $1`,
      [id],
    );
    if (localRes.rowCount === 0) {
      console.log(`✗ id=${id} not in local`);
      missing++;
      continue;
    }
    const prodRes = await prod.query(
      `SELECT ${COLS.join(', ')} FROM media WHERE id = $1`,
      [id],
    );
    if (prodRes.rowCount === 0) {
      console.log(`✗ id=${id} not in prod`);
      missing++;
      continue;
    }

    const localRow = localRes.rows[0];
    const prodRow = prodRes.rows[0];

    if (localRow.filename === prodRow.filename) {
      console.log(`= id=${id} already in sync (${prodRow.filename})`);
      skipped++;
      continue;
    }

    console.log(`→ id=${id} ${prodRow.filename} → ${localRow.filename}`);

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
    `\nDone — ${updated} ${EXECUTE ? 'updated' : 'would update'}, ${skipped} in sync, ${missing} missing`,
  );
} finally {
  await local.end();
  await prod.end();
}

process.exit(missing > 0 ? 1 : 0);
