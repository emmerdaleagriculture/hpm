#!/usr/bin/env node
/**
 * scripts/clear-broken-hero-images.mjs
 *
 * Sets `heroImage` to null on every Service and Post whose current
 * heroImage points at a media row whose file no longer resolves in
 * the shared Supabase bucket. Pages render without a hero rather
 * than with a broken image — better than the current state, and
 * non-destructive (the editor can pick a fresh hero in the admin).
 *
 * Idempotent. Dry-run by default.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   node scripts/clear-broken-hero-images.mjs                          # dry-run
 *   node scripts/clear-broken-hero-images.mjs --execute                # local
 *   DATABASE_URL=$DATABASE_URL_PROD node scripts/clear-broken-hero-images.mjs --execute
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

// Build the set of broken media ids once.
const allMedia = await payload.find({ collection: 'media', limit: 0, depth: 0 });
const brokenIds = new Set();
for (const m of allMedia.docs) {
  if (!m.filename) {
    brokenIds.add(m.id);
    continue;
  }
  if (!(await exists(m.filename))) brokenIds.add(m.id);
}
console.log(`Broken media ids: ${brokenIds.size}`);
console.log(EXECUTE ? '[execute] writing fixes\n' : '[dry-run] use --execute to write\n');

let totalCleared = 0;
let totalFailed = 0;

async function clearOnCollection(slug) {
  const res = await payload.find({ collection: slug, limit: 0, depth: 0 });
  let cleared = 0;
  for (const doc of res.docs) {
    const heroId = typeof doc.heroImage === 'object' ? doc.heroImage?.id : doc.heroImage;
    if (typeof heroId !== 'number' || !brokenIds.has(heroId)) continue;
    console.log(`  [clear] ${slug}/${doc.id} (${doc.slug ?? doc.title ?? '?'}): heroImage was ${heroId}`);
    if (!EXECUTE) {
      cleared++;
      continue;
    }
    try {
      await payload.update({ collection: slug, id: doc.id, data: { heroImage: null } });
      cleared++;
    } catch (err) {
      console.error(`    error: ${err instanceof Error ? err.message : err}`);
      totalFailed++;
    }
  }
  return cleared;
}

const svcCleared = await clearOnCollection('services');
const postCleared = await clearOnCollection('posts');
totalCleared = svcCleared + postCleared;

console.log(
  `\nDone — services=${svcCleared}, posts=${postCleared}, total=${totalCleared} ${EXECUTE ? 'cleared' : 'would clear'}, ${totalFailed} failed.`,
);
process.exit(totalFailed > 0 ? 1 : 0);
