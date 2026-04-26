#!/usr/bin/env node
/**
 * scripts/remove-broken-upload-nodes.mjs
 *
 * Walks every richText document and removes Lexical upload-type
 * nodes whose `value` references a media row whose file no longer
 * resolves in the shared Supabase bucket.
 *
 * Targets:
 *   - Globals: homepage, site-settings, pricing-page (all richText)
 *   - Collections: services (richText body content, not the
 *     heroImage), posts, pages
 *
 * The removal happens in-place on the children array. Lexical's
 * root.children tolerates arbitrary length, so dropping a single
 * upload node is structurally safe.
 *
 * Idempotent. Dry-run by default.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   node scripts/remove-broken-upload-nodes.mjs                                 # dry-run
 *   node scripts/remove-broken-upload-nodes.mjs --execute                       # local
 *   DATABASE_URL=$DATABASE_URL_PROD node scripts/remove-broken-upload-nodes.mjs --execute
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

const allMedia = await payload.find({ collection: 'media', limit: 0, depth: 0 });
const brokenIds = new Set();
for (const m of allMedia.docs) {
  if (!m.filename || !(await exists(m.filename))) brokenIds.add(m.id);
}
console.log(`Broken media ids: ${brokenIds.size}`);
console.log(EXECUTE ? '[execute] writing fixes\n' : '[dry-run] use --execute to write\n');

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function uploadNodeMediaId(node) {
  if (!isPlainObject(node) || node.type !== 'upload' || node.relationTo !== 'media') return null;
  const v = node.value;
  if (typeof v === 'number') return v;
  if (isPlainObject(v) && typeof v.id === 'number') return v.id;
  return null;
}

/** Recursively prune broken upload nodes; returns count removed. */
function prune(node) {
  let removed = 0;
  if (!node) return 0;
  if (Array.isArray(node)) {
    // First, recurse into each child
    for (const c of node) removed += prune(c);
    // Then, filter out broken upload nodes from this array
    for (let i = node.length - 1; i >= 0; i--) {
      const id = uploadNodeMediaId(node[i]);
      if (id != null && brokenIds.has(id)) {
        node.splice(i, 1);
        removed++;
      }
    }
    return removed;
  }
  if (!isPlainObject(node)) return 0;
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v) || isPlainObject(v)) removed += prune(v);
  }
  return removed;
}

let totalDocs = 0;
let totalNodes = 0;
let totalFailed = 0;

async function processCollection(slug) {
  const res = await payload.find({ collection: slug, limit: 0, depth: 0 });
  for (const doc of res.docs) {
    const removed = prune(doc);
    if (removed === 0) continue;
    console.log(`  [${slug}/${doc.id}] removed ${removed} broken upload node(s)`);
    if (EXECUTE) {
      try {
        const { id, createdAt: _ca, updatedAt: _ua, ...data } = doc;
        await payload.update({ collection: slug, id, data });
      } catch (err) {
        console.error(`    error: ${err instanceof Error ? err.message : err}`);
        totalFailed++;
        continue;
      }
    }
    totalDocs++;
    totalNodes += removed;
  }
}

async function processGlobal(slug) {
  try {
    const data = await payload.findGlobal({ slug, depth: 0 });
    const removed = prune(data);
    if (removed === 0) return;
    console.log(`  [global=${slug}] removed ${removed} broken upload node(s)`);
    if (EXECUTE) {
      const { id: _id, createdAt: _ca, updatedAt: _ua, ...payloadData } = data;
      await payload.updateGlobal({ slug, data: payloadData });
    }
    totalDocs++;
    totalNodes += removed;
  } catch (err) {
    console.warn(`  [global=${slug}] skipped: ${err instanceof Error ? err.message : err}`);
  }
}

for (const g of ['homepage', 'site-settings', 'pricing-page']) {
  await processGlobal(g);
}
for (const c of ['services', 'posts', 'pages']) {
  await processCollection(c);
}

console.log(
  `\nDone — ${totalDocs} doc(s) ${EXECUTE ? 'updated' : 'would update'}, ${totalNodes} broken upload node(s) removed, ${totalFailed} failed.`,
);
process.exit(totalFailed > 0 ? 1 : 0);
