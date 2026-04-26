#!/usr/bin/env node
/**
 * scripts/hide-broken-media.mjs
 *
 * For every Media row whose `filename` no longer resolves in the
 * shared Supabase bucket (HTTP 200 on the public URL), set
 * `hideFromGallery = true` so the public /gallery page stops
 * rendering broken images.
 *
 * Doesn't delete the DB row — those records may still be referenced
 * as a service hero, a post hero, an inline upload in a richText
 * block etc. Setting the flag is reversible and limited in scope.
 *
 * Idempotent. Dry-run by default.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   node scripts/hide-broken-media.mjs                                # dry-run local
 *   node scripts/hide-broken-media.mjs --execute                      # local
 *   DATABASE_URL=$DATABASE_URL_PROD node scripts/hide-broken-media.mjs --execute
 */
import { getPayload } from 'payload';
import config from '../src/payload/payload.config.ts';

const EXECUTE = process.argv.includes('--execute');
const SUPABASE_BASE =
  'https://unakyuksioglmihvipmi.supabase.co/storage/v1/object/public/hpm-media/media/';

async function exists(filename) {
  if (!filename) return false;
  try {
    const r = await fetch(SUPABASE_BASE + filename, { method: 'HEAD' });
    return r.ok;
  } catch {
    return false;
  }
}

const payload = await getPayload({ config });

console.log(EXECUTE ? '[execute] writing fixes' : '[dry-run] no writes — pass --execute');

const all = await payload.find({
  collection: 'media',
  where: { mimeType: { contains: 'image/' } },
  limit: 0,
  depth: 0,
});
console.log(`Total image media rows: ${all.docs.length}`);

let alreadyHidden = 0;
let okFile = 0;
let toHide = 0;
let updated = 0;
let failed = 0;

for (const m of all.docs) {
  if (m.hideFromGallery === true) {
    alreadyHidden++;
    continue;
  }
  if (!m.filename) {
    console.log(`  [no-filename] id=${m.id} → hide`);
    toHide++;
    if (EXECUTE) {
      try {
        await payload.update({ collection: 'media', id: m.id, data: { hideFromGallery: true } });
        updated++;
      } catch (err) {
        console.error(`    error: ${err instanceof Error ? err.message : err}`);
        failed++;
      }
    }
    continue;
  }
  if (await exists(m.filename)) {
    okFile++;
    continue;
  }
  console.log(`  [hide] id=${m.id} ${m.filename}`);
  toHide++;
  if (EXECUTE) {
    try {
      await payload.update({ collection: 'media', id: m.id, data: { hideFromGallery: true } });
      updated++;
    } catch (err) {
      console.error(`    error: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }
}

console.log(
  `\nDone — ${toHide} to hide (${updated} ${EXECUTE ? 'updated' : 'would update'}, ${failed} failed), ${okFile} files OK, ${alreadyHidden} already hidden.`,
);
process.exit(failed > 0 ? 1 : 0);
