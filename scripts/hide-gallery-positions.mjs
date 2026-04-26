#!/usr/bin/env node
/**
 * scripts/hide-gallery-positions.mjs
 *
 * Sets `hideFromGallery: true` on the media records that are at the
 * given gallery positions (1-indexed, sort: -createdAt, image/* only) —
 * the same order the public /gallery page uses. Position is recomputed
 * against whichever DB the script is pointed at, so the same --positions
 * list works on both local and prod regardless of id drift.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   node scripts/hide-gallery-positions.mjs --positions=4,5,6                   # dry-run
 *   node scripts/hide-gallery-positions.mjs --positions=4,5,6 --execute         # write
 *   DATABASE_URL=$DATABASE_URL_PROD node scripts/hide-gallery-positions.mjs \
 *     --positions=4,5,6 --execute
 *
 *   --unhide   inverse: sets hideFromGallery=false instead (still by position,
 *              which only resolves images currently visible — to unhide already
 *              hidden ones use the admin UI or pass --include-hidden).
 *   --include-hidden  include hidden images when numbering positions.
 */

import { getPayload } from 'payload';
import config from '../src/payload/payload.config.ts';

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const UNHIDE = args.includes('--unhide');
const INCLUDE_HIDDEN = args.includes('--include-hidden');
const POS_ARG = args.find((a) => a.startsWith('--positions='))?.slice(12);

if (!POS_ARG) {
  console.error('Required: --positions=1,2,3');
  process.exit(2);
}

const positions = POS_ARG
  .split(',')
  .map((s) => Number(s.trim()))
  .filter(Number.isFinite);

const positionSet = new Set(positions);

const payload = await getPayload({ config });

const where = INCLUDE_HIDDEN
  ? { mimeType: { contains: 'image/' } }
  : { mimeType: { contains: 'image/' }, hideFromGallery: { not_equals: true } };

const res = await payload.find({
  collection: 'media',
  where,
  sort: '-createdAt',
  limit: 0,
  depth: 0,
});

console.log(
  `${EXECUTE ? '[execute]' : '[dry-run]'} ${UNHIDE ? 'unhiding' : 'hiding'} positions: ${positions.join(',')}`,
);
console.log(`Total candidate images in this view: ${res.docs.length}`);

const targets = [];
res.docs.forEach((m, i) => {
  const pos = i + 1;
  if (positionSet.has(pos)) targets.push({ pos, id: m.id, filename: m.filename });
});

const missing = positions.filter((p) => !targets.find((t) => t.pos === p));
if (missing.length) {
  console.warn(`Positions out of range / not found: ${missing.join(',')}`);
}

console.log('\nTargets:');
console.log('pos\tid\tfilename');
for (const t of targets) {
  console.log(`${t.pos}\t${t.id}\t${t.filename ?? ''}`);
}

if (!EXECUTE) {
  console.log('\nDry-run only. Re-run with --execute to write.');
  process.exit(0);
}

let updated = 0;
let failed = 0;
for (const t of targets) {
  try {
    await payload.update({
      collection: 'media',
      id: t.id,
      data: { hideFromGallery: !UNHIDE },
    });
    updated++;
  } catch (err) {
    console.error(`✗ id=${t.id}: ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

console.log(`\nDone — ${updated} updated, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
