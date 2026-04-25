#!/usr/bin/env node
/**
 * scripts/generate-service-descriptions.mjs
 *
 * Adds a single richText body block to Service records that have no
 * content blocks yet. Hand-written copy keyed by slug — not LLM-generated.
 * Idempotent: services that already have any content blocks are skipped.
 *
 * Usage:
 *   node scripts/generate-service-descriptions.mjs            # dry-run
 *   node scripts/generate-service-descriptions.mjs --execute  # write
 *
 * Add a slug entry to DESCRIPTIONS to cover more services later.
 */

import { getPayload } from 'payload';
import config from '../src/payload/payload.config.ts';

const EXECUTE = process.argv.includes('--execute');

// Each entry is an array of paragraph strings (one paragraph per element).
// Keep it factual and Hampshire-flavoured; this lands on the live site.
const DESCRIPTIONS = {
  flailing: [
    'Flailing is the right tool when grass and weeds have got away from you. The flail head shreds tough stalks, brambles, nettles and rank cover that a topper would just push over, leaving a mulched layer that breaks down quickly and feeds the sward.',
    "We run KUHN flail mowers behind a 4WD compact tractor, so we can get into smaller paddocks, around mature trees and along boundaries without rutting the ground. It's the standard treatment for paddocks that haven't seen a cut in 12 months or longer, and for finishing the season's growth before winter.",
    'Best done late summer or early autumn once seed heads have set. Same-week bookings are usually possible across Hampshire and the surrounding counties.',
  ],
  'flail-collecting': [
    "Flail collecting cuts and lifts the material in one pass. Instead of leaving a mulch on the surface, the cuttings are blown into a high-tip hopper and removed — useful when you're trying to take fertility out of a paddock for horses, or when the volume of growth is heavy enough to smother the regrowth underneath.",
    'Particularly suited to paddocks managed for laminitic ponies, or fields being prepared for reseeding where you need to clear thatch before working the ground. We use the John Deere 4066M with a Kuhn flail-collector setup.',
    'Pricing depends on volume; quotes given on a per-acre basis after a quick site visit or photos.',
  ],
  'finish-mowing': [
    'Finish mowing gives a clean, even cut for paddocks and amenity grass that are already in good shape. Tighter cut height than a topper, no scalping, and the deck design means a tidier finish on lawns, equestrian arenas surrounds and small recreation areas.',
    "Right for grass under about six inches that you want kept regular through the season — typically every three to four weeks during peak growth, easing back in late summer. Heavier or rougher cover is better off going to a topper or flail first; we'll tell you which on a quick visit.",
  ],
  'mole-ploughing': [
    "Mole ploughing creates drainage channels through subsoil without disturbing the surface. A bullet-shaped mole is pulled at depth — typically 18 to 22 inches — and forms a continuous slit drain that lasts several years in clay-heavy soils. It's a cheap, fast way to dry out a wet paddock that holds water through winter.",
    'Best done when the topsoil is firm and dry but the subsoil still has moisture — late spring through summer is the window. We use a Deleks mole plough behind the John Deere 4066M, working in parallel runs at four-to-six metre spacing.',
    "If your paddock pugs badly in winter or holds standing water for more than a day or two after rain, this is usually the first thing to try before considering full piped drainage — it's an order of magnitude cheaper.",
  ],
  'stone-burying': [
    "Stone burying inverts the top layer of soil, dropping stones, debris and surface vegetation underneath and leaving a fine, level seedbed on top. It's the cleanest way to prepare ground for reseeding, especially after rotavating or where the surface is stony.",
    "We run a John Deere 2038R with a stone burier — compact enough for small paddocks and gateways, but with the weight to do a proper job. One pass typically gets you to a finish you can drill or broadcast straight onto.",
    'Often paired with overseeding or a full reseed; we can quote both together if you want the paddock back into use as quickly as possible.',
  ],
  'land-ditch-clearance': [
    'Boundaries, ditches and drainage outfalls all silt up and overgrow on a five-to-ten-year cycle. Once the water stops moving, the field next to them gets wetter every winter — so keeping them clear is one of the highest-leverage things you can do for a paddock that floods.',
    'We clear scrub and brambles from boundaries, dig out and re-profile ditches to restore flow, and clear culverts and outfalls so water leaves the site. Spoil is either spread locally or carted off, depending on what you want.',
    "Best done in late autumn or early winter once foliage has died back and before the ground gets too soft. Quotes are by the hour or by the metre — whichever's cleaner for the job.",
  ],
  spraying: [
    "Targeted herbicide application for ragwort, docks, thistles, nettles and other paddock weeds. We're PA1, PA2 and PA6 certified for boom and knapsack work, and only spray on suitable days — no drift, no off-target kill, no risk to neighbouring crops or watercourses.",
    "Spot-spraying is usually the right answer for established paddocks where you want to keep the existing sward intact. For heavy infestations or pre-reseed clearance, a full boom application makes more sense — we'll talk through the trade-offs before quoting.",
    "All chemicals stored, mixed and applied to current legislation, with a written record kept of every job. Happy to share spray records for assurance schemes or insurance.",
  ],
};

function paragraphsToLexical(paragraphs) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [
          {
            type: 'text',
            text,
            format: 0,
            detail: 0,
            mode: 'normal',
            style: '',
            version: 1,
          },
        ],
      })),
    },
  };
}

const payload = await getPayload({ config });

console.log(EXECUTE ? '[execute] writing changes\n' : '[dry-run] no writes (pass --execute)\n');

let added = 0;
let skipped = 0;
let missing = 0;

for (const [slug, paragraphs] of Object.entries(DESCRIPTIONS)) {
  const found = await payload.find({
    collection: 'services',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  });
  const svc = found.docs[0];
  if (!svc) {
    console.log(`✗ ${slug.padEnd(24)} service not found`);
    missing++;
    continue;
  }

  const existingBlocks = Array.isArray(svc.content) ? svc.content : [];
  if (existingBlocks.length > 0) {
    console.log(`= ${slug.padEnd(24)} already has ${existingBlocks.length} content block(s)`);
    skipped++;
    continue;
  }

  console.log(`→ ${slug.padEnd(24)} adding ${paragraphs.length}-paragraph richText block`);

  if (EXECUTE) {
    await payload.update({
      collection: 'services',
      id: svc.id,
      data: {
        content: [
          { blockType: 'richText', content: paragraphsToLexical(paragraphs) },
        ],
      },
    });
  }
  added++;
}

console.log(
  `\nDone — ${added} ${EXECUTE ? 'updated' : 'would update'}, ${skipped} unchanged, ${missing} missing`,
);

process.exit(missing > 0 ? 1 : 0);
