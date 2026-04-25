#!/usr/bin/env node
/**
 * scripts/regenerate-media-sizes.mjs
 *
 * Re-uploads existing Media records so Payload regenerates all configured
 * imageSizes. Use after adding a new variant to media.ts (e.g. 'large').
 * Existing variants are also re-derived; original file is preserved.
 *
 * Usage:
 *   node scripts/regenerate-media-sizes.mjs                         # dry-run
 *   node scripts/regenerate-media-sizes.mjs --execute               # all images
 *   node scripts/regenerate-media-sizes.mjs --execute --id=131      # one record
 *   node scripts/regenerate-media-sizes.mjs --execute --missing=large
 *     # only records that don't already have the named size
 *
 * Each record costs one full-resolution download from Supabase + a
 * Sharp re-process + a storage write. Be patient with 100+ records.
 */

import { getPayload } from 'payload';
import config from '../src/payload/payload.config.ts';

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const ID_ARG = args.find((a) => a.startsWith('--id='))?.slice(5);
const MISSING_ARG = args.find((a) => a.startsWith('--missing='))?.slice(10);
const FORCE_LOCAL = args.includes('--i-know-storage-is-shared');

const SUPABASE_BASE =
  'https://unakyuksioglmihvipmi.supabase.co/storage/v1/object/public/hpm-media/media/';

// Guard: re-uploading via Payload deletes the previous file from storage
// and writes a uniquified replacement. The dev DB shares its Supabase
// bucket with prod, so running this against a local DB silently breaks
// the prod site (prod rows still reference the now-deleted originals).
// See scripts/sync-media-paths-to-prod.mjs for the corrective.
if (EXECUTE) {
  const dbUrl = process.env.DATABASE_URL ?? '';
  const looksLocal = /(^|@|\/\/)(localhost|127\.0\.0\.1|::1)(:|\/)/i.test(dbUrl);
  if (looksLocal && !FORCE_LOCAL) {
    console.error(
      'Refusing: DATABASE_URL points at a local DB but storage is shared with prod.\n' +
      'Running this here would delete prod-referenced files from the shared bucket.\n' +
      'Either:\n' +
      '  • Run with DATABASE_URL set to prod (DATABASE_URL=$DATABASE_URL_PROD ...)\n' +
      '  • Or, if your local stack genuinely has its own bucket now, pass\n' +
      '    --i-know-storage-is-shared to override.',
    );
    process.exit(2);
  }
}

const payload = await getPayload({ config });

console.log(EXECUTE ? '[execute] re-uploading' : '[dry-run] no writes (pass --execute)');

const where = ID_ARG
  ? { id: { equals: Number(ID_ARG) } }
  : { mimeType: { contains: 'image/' } };

const res = await payload.find({
  collection: 'media',
  where,
  limit: 0,
  depth: 0,
});

let processed = 0;
let skipped = 0;
let failed = 0;

for (const m of res.docs) {
  if (!m.filename) {
    console.log(`✗ id=${m.id} no filename`);
    skipped++;
    continue;
  }
  if (MISSING_ARG && m.sizes?.[MISSING_ARG]?.filename) {
    console.log(`= id=${m.id} already has '${MISSING_ARG}'`);
    skipped++;
    continue;
  }

  const url = SUPABASE_BASE + m.filename;
  console.log(`→ id=${m.id} ${m.filename}`);

  if (!EXECUTE) {
    processed++;
    continue;
  }

  try {
    const fetched = await fetch(url);
    if (!fetched.ok) {
      console.log(`  fetch failed: ${fetched.status}`);
      failed++;
      continue;
    }
    const buffer = Buffer.from(await fetched.arrayBuffer());
    await payload.update({
      collection: 'media',
      id: m.id,
      data: {},
      file: {
        data: buffer,
        mimetype: m.mimeType ?? 'image/webp',
        name: m.filename,
        size: buffer.byteLength,
      },
    });
    processed++;
  } catch (err) {
    console.log(`  error: ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

console.log(
  `\nDone — ${processed} ${EXECUTE ? 'processed' : 'would process'}, ${skipped} skipped, ${failed} failed`,
);

process.exit(failed > 0 ? 1 : 0);
