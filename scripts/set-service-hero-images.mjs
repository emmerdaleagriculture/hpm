#!/usr/bin/env node
/**
 * scripts/set-service-hero-images.mjs
 *
 * One-shot: assign Media-collection IDs to Services as their heroImage.
 * Idempotent — re-running with the same map is a no-op when values already
 * match. Default is dry-run; pass --execute to write.
 *
 * Usage:
 *   node scripts/set-service-hero-images.mjs            # dry-run
 *   node scripts/set-service-hero-images.mjs --execute  # write
 */

import { getPayload } from 'payload';
import config from '../src/payload/payload.config.ts';

// IDs are Media-collection rows (resolved from the gallery's display
// position; gallery sorts by -createdAt, image-only).
const ASSIGNMENTS = [
  { slug: 'flail-collecting',     heroImage: 34  }, // gallery pos 141
  { slug: 'mole-ploughing',       heroImage: 148 }, // gallery pos 27
  { slug: 'stone-burying',        heroImage: 51  }, // gallery pos 124
  { slug: 'land-ditch-clearance', heroImage: 26  }, // gallery pos 149
  { slug: 'weed-control',         heroImage: 131 }, // gallery pos 44
  { slug: 'spraying',             heroImage: 130 }, // gallery pos 45
  { slug: 'overseeding',          heroImage: 33  }, // gallery pos 142
  { slug: 'rolling',               heroImage: 48  }, // gallery pos 127
];

const EXECUTE = process.argv.includes('--execute');

const payload = await getPayload({ config });

console.log(EXECUTE ? '[execute] writing changes\n' : '[dry-run] no writes (pass --execute)\n');

let changed = 0;
let skipped = 0;
let missing = 0;

for (const { slug, heroImage } of ASSIGNMENTS) {
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

  const currentId =
    typeof svc.heroImage === 'object' && svc.heroImage !== null
      ? svc.heroImage.id
      : svc.heroImage;

  if (currentId === heroImage) {
    console.log(`= ${slug.padEnd(24)} already heroImage=${heroImage}`);
    skipped++;
    continue;
  }

  console.log(
    `→ ${slug.padEnd(24)} ${currentId ?? '(none)'} → ${heroImage}`,
  );

  if (EXECUTE) {
    await payload.update({
      collection: 'services',
      id: svc.id,
      data: { heroImage },
    });
  }
  changed++;
}

console.log(
  `\nDone — ${changed} ${EXECUTE ? 'updated' : 'would update'}, ${skipped} unchanged, ${missing} missing`,
);

process.exit(missing > 0 ? 1 : 0);
