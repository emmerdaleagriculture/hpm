#!/usr/bin/env node
/**
 * scripts/normalise-lexical-uploads.mjs
 *
 * Walks every rich-text-bearing document in the CMS and rewrites Lexical
 * Upload nodes whose `value` is the populated media object so it becomes
 * just the numeric id. Payload v3's Lexical UploadFeature expects an
 * unpopulated id; an object value crashes the admin editor with:
 *
 *   "Upload value should be a string or number. The Lexical Upload
 *    component should not receive the populated value object."
 *
 * Targets:
 *   - Globals: homepage, site-settings, pricing-page (any richText field)
 *   - Collections: pages, posts, services (and any collection with a
 *     richText or blocks-of-richText field — discovered at runtime).
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   node scripts/normalise-lexical-uploads.mjs                # dry-run
 *   node scripts/normalise-lexical-uploads.mjs --execute      # write
 *   DATABASE_URL=$DATABASE_URL_PROD node scripts/normalise-lexical-uploads.mjs --execute
 */

import { getPayload } from 'payload';
import config from '../src/payload/payload.config.ts';

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');

const payload = await getPayload({ config });

let scanned = 0;
let mutated = 0;
let nodes = 0;

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

// Recursively rewrite upload-node values. Returns true if anything changed.
function normalise(node) {
  let changed = false;
  if (Array.isArray(node)) {
    for (const c of node) if (normalise(c)) changed = true;
    return changed;
  }
  if (!isPlainObject(node)) return false;

  if (node.type === 'upload' && node.relationTo && isPlainObject(node.value)) {
    const id = node.value.id ?? node.value._id;
    if (id != null) {
      node.value = id;
      nodes++;
      changed = true;
    }
  }

  for (const key of Object.keys(node)) {
    const v = node[key];
    if (Array.isArray(v) || isPlainObject(v)) {
      if (normalise(v)) changed = true;
    }
  }
  return changed;
}

async function processGlobal(slug) {
  const data = await payload.findGlobal({ slug, depth: 0 });
  scanned++;
  const before = JSON.stringify(data);
  const changed = normalise(data);
  if (!changed) return;
  console.log(`  global=${slug} mutated`);
  mutated++;
  if (EXECUTE) {
    // Strip system fields Payload doesn't accept on update
    const { id: _id, createdAt: _ca, updatedAt: _ua, ...payloadData } = data;
    await payload.updateGlobal({ slug, data: payloadData });
  } else {
    const after = JSON.stringify(data);
    console.log(`    bytes ${before.length} -> ${after.length}`);
  }
}

async function processCollection(slug) {
  const res = await payload.find({ collection: slug, limit: 0, depth: 0 });
  for (const doc of res.docs) {
    scanned++;
    const changed = normalise(doc);
    if (!changed) continue;
    console.log(`  ${slug}/${doc.id} mutated`);
    mutated++;
    if (EXECUTE) {
      const { id, createdAt: _ca, updatedAt: _ua, ...payloadData } = doc;
      await payload.update({ collection: slug, id, data: payloadData });
    }
  }
}

console.log(EXECUTE ? '[execute] writing fixes' : '[dry-run] no writes (pass --execute)');

for (const g of ['homepage', 'site-settings', 'pricing-page']) {
  try {
    await processGlobal(g);
  } catch (e) {
    console.warn(`  global=${g} skipped: ${e instanceof Error ? e.message : e}`);
  }
}

for (const c of ['pages', 'posts', 'services']) {
  try {
    await processCollection(c);
  } catch (e) {
    console.warn(`  collection=${c} skipped: ${e instanceof Error ? e.message : e}`);
  }
}

console.log(
  `\nDone — scanned=${scanned} docs, mutated=${mutated} docs, normalised=${nodes} upload nodes`,
);
process.exit(0);
