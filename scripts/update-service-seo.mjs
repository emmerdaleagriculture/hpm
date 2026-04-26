#!/usr/bin/env node
/**
 * scripts/update-service-seo.mjs
 *
 * Rewrites SEO meta titles + descriptions on service pages whose
 * GSC impressions are high but CTR is near zero. Targets the
 * "almost there" queries identified in the 2026-04-26 audit:
 *
 *   rotavating       — 414 imp, pos 6.1, 0 clicks  (query: "rotavating")
 *   rolling          —  47 imp, pos 5.7, 0 clicks  (query: "paddock rolling")
 *   harrowing        —  38 imp, pos 9.0, 0 clicks  (query: "harrowing field")
 *   mole-ploughing   — 229 imp, pos 1.6, 0.9% CTR  (query: "mole plough pipe laying")
 *   manure-sweeping  — 139 imp, pos 12.6, 6.5%     (query: "muck heap removal hampshire")
 *
 * Title strategy: include the search-intent term + the locality
 * + a click-worthy benefit. ≤60 chars to avoid truncation in SERP.
 * Description strategy: lead with what / where / who, follow with
 * differentiator (compact tractor, grass tyres, no ruts).
 * ≤155 chars.
 *
 * Idempotent. Dry-run by default.
 */
import { getPayload } from 'payload';
import config from '../src/payload/payload.config.ts';

const EXECUTE = process.argv.includes('--execute');

const UPDATES = [
  {
    slug: 'rotavating',
    metaTitle: 'Field Rotavating Hampshire — Soil Prep & Reseed',
    metaDescription:
      'Compact-tractor field rotavating across Hampshire, Wiltshire, Berkshire and Surrey. Loosens compacted soil, prepares ground for reseeding, leaves no ruts.',
  },
  {
    slug: 'rolling',
    metaTitle: 'Paddock Rolling Hampshire — Even Ground, Healthy Grass',
    metaDescription:
      'Professional paddock rolling in Hampshire and the surrounding counties. Levels poached ground, encourages tillering, lets the mower run smoothly all season.',
  },
  {
    slug: 'harrowing',
    metaTitle: 'Field Harrowing Hampshire — Spring Pasture Refresh',
    metaDescription:
      'Compact-tractor field harrowing across Hampshire, Wiltshire and Berkshire. Tears out dead grass and moss, aerates the surface, lets new growth come through.',
  },
  {
    slug: 'mole-ploughing',
    metaTitle: 'Mole Ploughing Hampshire — Drainage Without Trenches',
    metaDescription:
      'Compact-tractor mole ploughing — sub-soil drainage channels at 18–22 inches without disturbing the surface. Pipe-laying option available. Hampshire and surrounding counties.',
  },
  {
    slug: 'manure-sweeping',
    metaTitle: 'Manure Sweeping Hampshire — Cleaner Paddocks, Less Worm Burden',
    metaDescription:
      'Mechanical manure / dung sweeping across Hampshire and the surrounding counties. Cleans paddocks fast, cuts worm burden, and leaves the field ready to graze.',
  },
];

const payload = await getPayload({ config });

console.log(EXECUTE ? '[execute] writing SEO updates' : '[dry-run] use --execute to write');
console.log();

let updated = 0;
let unchanged = 0;
let missing = 0;

for (const u of UPDATES) {
  const found = await payload.find({
    collection: 'services',
    where: { slug: { equals: u.slug } },
    limit: 1,
    depth: 0,
  });
  const svc = found.docs[0];
  if (!svc) {
    console.log(`  [missing] ${u.slug}`);
    missing++;
    continue;
  }

  const cur = svc.seo ?? {};
  const sameTitle = cur.metaTitle === u.metaTitle;
  const sameDesc = cur.metaDescription === u.metaDescription;
  if (sameTitle && sameDesc) {
    console.log(`  [unchanged] ${u.slug}`);
    unchanged++;
    continue;
  }

  console.log(`  [update] ${u.slug}`);
  console.log(`    title was:  "${cur.metaTitle ?? '(none)'}"`);
  console.log(`    title now:  "${u.metaTitle}"`);
  console.log(`    desc was:   "${(cur.metaDescription ?? '(none)').slice(0, 100)}..."`);
  console.log(`    desc now:   "${u.metaDescription.slice(0, 100)}..."`);

  if (!EXECUTE) continue;

  try {
    await payload.update({
      collection: 'services',
      id: svc.id,
      data: {
        seo: {
          ...cur,
          metaTitle: u.metaTitle,
          metaDescription: u.metaDescription,
        },
      },
    });
    updated++;
  } catch (err) {
    console.error(`    error: ${err instanceof Error ? err.message : err}`);
  }
}

console.log(`\nDone — ${updated} updated, ${unchanged} unchanged, ${missing} missing`);
process.exit(0);
