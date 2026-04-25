#!/usr/bin/env node
/**
 * scripts/audit-slugs.mjs
 *
 * Inventories every URL the WordPress import produced (services, pages,
 * posts) and compares against the canonical new-site service list. Writes
 * `audit-slugs-report.md` with:
 *
 *   - Live service slugs (in DB) and whether they appear in the new
 *     site's nav/footer/contact-form list
 *   - Known service slug remaps (old → new) to drop into next.config
 *   - Items still needing Tom's decision
 *   - Pages and posts (informational)
 *   - Suggested redirect block
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   node scripts/audit-slugs.mjs
 *
 * Output: ./audit-slugs-report.md
 */

import { writeFile } from 'node:fs/promises';
import { getPayload } from 'payload';
import config from '../src/payload/payload.config.ts';

// New-site canonical service slugs (sourced from ContactForm SERVICE_GROUPS,
// the footer's hardcoded list, and the curated taxonomy).
const CANONICAL_SERVICES = new Set([
  'paddock-topping',
  'flailing',
  'flail-collecting',
  'finish-mowing',
  'harrowing',
  'rolling',
  'rotavating',
  'mole-ploughing',
  'stone-burying',
  'land-ditch-clearance',
  'weed-control',
  'spraying',
  'fertiliser-application',
  'overseeding',
  'manure-sweeping',
]);

// Old-WP slug → new canonical slug. Anything that's a known straight
// rename goes here. Drop-in for the next.config redirects block.
const KNOWN_REMAPS = {
  'dung-sweeping':         'manure-sweeping',
  'fertiliser-spraying':   'fertiliser-application',
  'field-harrowing':       'harrowing',
  'field-rotavating':      'rotavating',
  'paddock-rolling':       'rolling',
  'ragwort-pulling':       'weed-control',
  'seedsight':             'overseeding',
};

const payload = await getPayload({ config });

const [services, pages, posts] = await Promise.all([
  payload.find({ collection: 'services', limit: 0, depth: 0 }),
  payload.find({ collection: 'pages',    limit: 0, depth: 0 }),
  payload.find({ collection: 'posts',    limit: 0, depth: 0 }),
]);

const liveServiceSlugs = new Set(services.docs.map((s) => s.slug).filter(Boolean));

// Categorise live service slugs
const inCanonical = [];
const orphanInDb  = []; // exists in DB but not in canonical list — needs Tom's call
for (const slug of liveServiceSlugs) {
  if (CANONICAL_SERVICES.has(slug)) inCanonical.push(slug);
  else orphanInDb.push(slug);
}

// Canonical entries that don't have a live DB record (would 404 if linked)
const missingFromDb = [...CANONICAL_SERVICES].filter((s) => !liveServiceSlugs.has(s));

// Remaps where the OLD slug is not in the canonical set (good — old WP URL,
// new site has no such page) and the NEW slug IS canonical (good — target
// exists). Anything unusual is flagged.
const remapRows = Object.entries(KNOWN_REMAPS).map(([from, to]) => ({
  from,
  to,
  toExists: liveServiceSlugs.has(to),
  fromCollidesWithLive: liveServiceSlugs.has(from), // i.e. old slug still in DB
}));

// Orphans needing decisions: in DB but not canonical AND not the FROM of a known remap
const knownFromSet = new Set(Object.keys(KNOWN_REMAPS));
const flaggedForDecision = orphanInDb.filter((s) => !knownFromSet.has(s));

// ---------- BUILD REPORT ----------

const lines = [];
const md = (s) => lines.push(s);
const today = new Date().toISOString().slice(0, 10);

md(`# Slug audit report\n`);
md(`Generated ${today}\n`);

md(`## Services\n`);
md(`### In canonical list (${inCanonical.length})`);
md(inCanonical.sort().map((s) => `- \`${s}\``).join('\n') || '_none_');
md('');
if (missingFromDb.length > 0) {
  md(`### Canonical but missing from DB (${missingFromDb.length})`);
  md('These appear in nav/footer/form but have no live record — would 404:');
  md(missingFromDb.sort().map((s) => `- \`${s}\``).join('\n'));
  md('');
}

md(`### Known service slug remaps (${remapRows.length})`);
md('Old WP slug → new slug. Already covered by next.config redirects:');
md('| Old | New | Target exists? | Old still in DB? |');
md('|---|---|---|---|');
for (const r of remapRows) {
  md(`| \`/services/${r.from}\` | \`/services/${r.to}\` | ${r.toExists ? '✓' : '✗ (broken — fix target)'} | ${r.fromCollidesWithLive ? '⚠ DB still serves old slug, redirect will conflict' : 'no, safe to redirect'} |`);
}
md('');

if (flaggedForDecision.length > 0) {
  md(`### Flagged for Tom's decision (${flaggedForDecision.length})`);
  md(`These services exist in the DB but aren't in the new nav/footer/form, and aren't covered by a known remap. Each needs a call:\n`);
  md('| Slug | Live URL | Suggested action |');
  md('|---|---|---|');
  for (const slug of flaggedForDecision.sort()) {
    let suggestion = '_unknown — pick one: keep live, redirect to a related service, or 410 Gone_';
    if (slug === 'field-ploughing')  suggestion = 'Redirect to `/services/rotavating` (closest active service) OR keep page live';
    if (slug === 'hedge-cutting')    suggestion = 'Redirect to `/services/land-ditch-clearance` OR keep page live';
    md(`| \`${slug}\` | \`/services/${slug}\` | ${suggestion} |`);
  }
  md('');
}

md(`## Pages (${pages.docs.length})`);
md(pages.docs.map((p) => `- \`/${p.slug}\``).sort().join('\n') || '_none_');
md('');

md(`## Posts (${posts.docs.length})`);
md('All posts route via `/notes/[slug]`. The `/blog/:slug → /notes/:slug` redirect covers the WP-era URLs.');
md('Sample of slugs (first 10):');
md(posts.docs.slice(0, 10).map((p) => `- \`${p.slug}\``).join('\n'));
if (posts.docs.length > 10) md(`- _...and ${posts.docs.length - 10} more_`);
md('');

md('## Suggested redirect block for `next.config.mjs`\n');
md('```js');
md('async redirects() {');
md('  return [');
md('    // Services renamed during the rebuild');
for (const r of remapRows) {
  if (r.toExists && !r.fromCollidesWithLive) {
    md(`    { source: '/services/${r.from}', destination: '/services/${r.to}', permanent: true },`);
  } else {
    md(`    // ⚠ skipped: /services/${r.from} → /services/${r.to} (${r.fromCollidesWithLive ? 'old slug still in DB' : 'target missing'})`);
  }
}
if (flaggedForDecision.length > 0) {
  md('');
  md('    // ⚠ Tom to decide — uncomment / edit the appropriate target:');
  for (const slug of flaggedForDecision.sort()) {
    md(`    // { source: '/services/${slug}', destination: '/services/<TBD>', permanent: true },`);
  }
}
md('');
md('    // Blog → Notes (already in next.config)');
md(`    { source: '/blog/:slug', destination: '/notes/:slug', permanent: true },`);
md('');
md('    // WooCommerce artefacts');
md(`    { source: '/shop',           destination: '/', permanent: true },`);
md(`    { source: '/shop/:path*',    destination: '/', permanent: true },`);
md(`    { source: '/cart',           destination: '/', permanent: true },`);
md(`    { source: '/checkout',       destination: '/', permanent: true },`);
md(`    { source: '/my-account',     destination: '/', permanent: true },`);
md(`    { source: '/my-account/:path*', destination: '/', permanent: true },`);
md(`    { source: '/wishlist',       destination: '/', permanent: true },`);
md(`    { source: '/products-compare', destination: '/', permanent: true },`);
md('');
md('    // Other old WP paths');
md(`    { source: '/tools',  destination: '/#fleet',   permanent: true },`);
md(`    { source: '/costs',  destination: '/services', permanent: true },`);
md(`    { source: '/videos', destination: '/notes',    permanent: true },`);
md('  ];');
md('}');
md('```');

const report = lines.join('\n') + '\n';
await writeFile('audit-slugs-report.md', report);

console.log(`\nWrote audit-slugs-report.md`);
console.log(`  ${inCanonical.length} canonical services in DB`);
console.log(`  ${missingFromDb.length} canonical services missing from DB`);
console.log(`  ${remapRows.length} known remaps`);
console.log(`  ${flaggedForDecision.length} flagged for Tom's decision`);
console.log(`  ${pages.docs.length} pages, ${posts.docs.length} posts`);

process.exit(0);
