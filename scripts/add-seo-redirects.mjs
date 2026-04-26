#!/usr/bin/env node
/**
 * scripts/add-seo-redirects.mjs
 *
 * Inserts the missing 301 redirects identified by GSC analysis. The
 * top-clicked old WordPress URLs (post permalinks like
 * /smooth-your-paddock-with-expert-rolling/) had no entry in either
 * next.config.mjs or the Payload Redirects collection — when DNS
 * flips to the rebuild, Google would have started returning 404 for
 * them, losing the accumulated rankings.
 *
 * Each old URL maps cleanly to /notes/<slug> (slugs are preserved).
 *
 * Idempotent: skips rows that already exist in the Redirects
 * collection. Dry-run by default.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   node scripts/add-seo-redirects.mjs                        # dry-run
 *   node scripts/add-seo-redirects.mjs --execute              # write local
 *   DATABASE_URL=$DATABASE_URL_PROD \
 *     node scripts/add-seo-redirects.mjs --execute            # write prod
 */
import { getPayload } from 'payload';
import config from '../src/payload/payload.config.ts';

const EXECUTE = process.argv.includes('--execute');

// Each entry is the old WP URL → new URL. Trailing slash matters in
// the Payload Redirects collection (the middleware compares as written).
const REDIRECTS = [
  ['/smooth-your-paddock-with-expert-rolling/', '/notes/smooth-your-paddock-with-expert-rolling'],
  ['/can-you-mole-plough-using-a-compact-tractor-with-grass-tyres/', '/notes/can-you-mole-plough-using-a-compact-tractor-with-grass-tyres'],
  ['/spotting-and-fixing-paddock-drainage-issues/', '/notes/spotting-and-fixing-paddock-drainage-issues'],
  ['/seedsight-the-simple-battery-free-hopper-level-sensor-for-seeders-fertiliser-and-storage-bins/', '/notes/seedsight-the-simple-battery-free-hopper-level-sensor-for-seeders-fertiliser-and-storage-bins'],
  ['/wessex-dung-beetle-possibly-the-worst-designed-agricultural-machine-ever/', '/notes/wessex-dung-beetle-possibly-the-worst-designed-agricultural-machine-ever'],
  ['/effective-field-rotavating-for-soil-health/', '/notes/effective-field-rotavating-for-soil-health'],
  ['/introducing-our-john-deere-aercore-1500/', '/notes/introducing-our-john-deere-aercore-1500'],
  ['/introducing-our-mcconnel-pa3430-hedge-cutter-and-compact-tractor-equipment-for-those-hard-to-reach-areas/', '/notes/introducing-our-mcconnel-pa3430-hedge-cutter-and-compact-tractor-equipment-for-those-hard-to-reach-areas'],
  ['/land-drainage-do-your-fields-just-turn-into-swamps-after-a-bit-of-rain/', '/notes/land-drainage-do-your-fields-just-turn-into-swamps-after-a-bit-of-rain'],
  ['/recognise-signs-your-paddock-needs-harrowing/', '/notes/recognise-signs-your-paddock-needs-harrowing'],
  ['/from-theft-to-triumph-clickasnap-founder-thomas-oswald-returns-with-lumenir/', '/notes/from-theft-to-triumph-clickasnap-founder-thomas-oswald-returns-with-lumenir'],
  ['/how-my-30m-business-videscape-clickasnap-com-was-stolen-by-jason-hill-and-collapsed-into-1m-in-debt-in-12-months/', '/notes/how-my-30m-business-videscape-clickasnap-com-was-stolen-by-jason-hill-and-collapsed-into-1m-in-debt-in-12-months'],
  ['/why-you-shouldnt-ever-use-clickasnap/', '/notes/why-you-shouldnt-ever-use-clickasnap'],
  ['/taylor-wessing-and-hmrc-get-stung-for-500000-after-spectacular-collapse-of-videscape-limited-clickasnap-com-under-jason-hill/', '/notes/taylor-wessing-and-hmrc-get-stung-for-500000-after-spectacular-collapse-of-videscape-limited-clickasnap-com-under-jason-hill'],
];

const payload = await getPayload({ config });

console.log(EXECUTE ? '[execute] writing redirects' : '[dry-run] use --execute to write');

let added = 0;
let skipped = 0;

for (const [from, to] of REDIRECTS) {
  const existing = await payload.find({
    collection: 'redirects',
    where: { from: { equals: from } },
    limit: 1,
    depth: 0,
  });
  if (existing.docs.length > 0) {
    console.log(`  [exists] ${from} → ${existing.docs[0].to}`);
    skipped++;
    continue;
  }

  console.log(`  [new]    ${from} → ${to}`);
  if (!EXECUTE) continue;

  try {
    await payload.create({
      collection: 'redirects',
      data: {
        from,
        to,
        statusCode: 301,
        active: true,
        notes: 'SEO recovery — top-clicked old WP URL, found via GSC audit 2026-04-26.',
      },
    });
    added++;
  } catch (err) {
    console.error(`    error: ${err instanceof Error ? err.message : err}`);
  }
}

console.log(`\nDone — ${added} added, ${skipped} skipped`);
process.exit(0);
