#!/usr/bin/env node
/**
 * One-off audit: pull current GSC numbers + identify SEO improvement
 * targets. Run against prod DB so we read the real refresh token.
 *
 *   set -a && source .env.local && set +a
 *   DATABASE_URL=$DATABASE_URL_PROD npx tsx scripts/_seo-audit.mjs
 */
import { gscQuery, isoDaysAgo } from '../src/lib/gsc.ts';

const RANGE = 90; // wider window for richer data
const LAG = 3;

const endDate = isoDaysAgo(LAG);
const startDate = isoDaysAgo(LAG + RANGE);
console.log(`\n=== GSC audit ${startDate} → ${endDate} (${RANGE}d) ===\n`);

const fmtN = (n) => n.toLocaleString('en-GB');
const pct = (n) => `${(n * 100).toFixed(1)}%`;
const pos = (n) => n.toFixed(1);

const [totals, queries, pages, devices, countries] = await Promise.all([
  gscQuery({ startDate, endDate, dimensions: [], rowLimit: 1 }),
  gscQuery({ startDate, endDate, dimensions: ['query'], rowLimit: 500 }),
  gscQuery({ startDate, endDate, dimensions: ['page'], rowLimit: 200 }),
  gscQuery({ startDate, endDate, dimensions: ['device'], rowLimit: 10 }),
  gscQuery({ startDate, endDate, dimensions: ['country'], rowLimit: 10 }),
]);

const t = totals[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
console.log('TOTALS');
console.log(`  clicks: ${fmtN(t.clicks)}`);
console.log(`  impressions: ${fmtN(t.impressions)}`);
console.log(`  CTR: ${pct(t.ctr)}`);
console.log(`  avg position: ${pos(t.position)}`);
console.log();

console.log('TOP 25 QUERIES BY CLICKS');
queries.slice(0, 25).forEach((r, i) => {
  console.log(`  ${(i + 1).toString().padStart(2)}. [pos ${pos(r.position).padStart(5)}] [ctr ${pct(r.ctr).padStart(6)}] ${fmtN(r.clicks).padStart(4)} clk / ${fmtN(r.impressions).padStart(6)} imp  "${r.keys?.[0] ?? ''}"`);
});
console.log();

console.log('ALMOST-THERE QUERIES (positions 4–10, by impressions desc — top 25)');
const almost = [...queries]
  .filter((r) => r.position >= 4 && r.position <= 10 && r.impressions > 0)
  .sort((a, b) => b.impressions - a.impressions)
  .slice(0, 25);
almost.forEach((r, i) => {
  console.log(`  ${(i + 1).toString().padStart(2)}. [pos ${pos(r.position).padStart(5)}] [ctr ${pct(r.ctr).padStart(6)}] ${fmtN(r.clicks).padStart(3)} clk / ${fmtN(r.impressions).padStart(5)} imp  "${r.keys?.[0] ?? ''}"`);
});
console.log();

const positiveImpr = queries.filter((r) => r.impressions >= 50);
const sortedCtr = [...positiveImpr].map((r) => r.ctr).sort((a, b) => a - b);
const median = sortedCtr.length ? sortedCtr[Math.floor(sortedCtr.length / 2)] : 0;
console.log(`CTR OPPORTUNITIES (≥50 impressions, CTR below median ${pct(median)} — top 25)`);
const ctrOpps = positiveImpr
  .filter((r) => r.ctr < median)
  .sort((a, b) => b.impressions - a.impressions)
  .slice(0, 25);
ctrOpps.forEach((r, i) => {
  console.log(`  ${(i + 1).toString().padStart(2)}. [pos ${pos(r.position).padStart(5)}] [ctr ${pct(r.ctr).padStart(6)}] ${fmtN(r.impressions).padStart(5)} imp  "${r.keys?.[0] ?? ''}"`);
});
console.log();

console.log('TOP 20 PAGES BY CLICKS');
pages.slice(0, 20).forEach((r, i) => {
  const url = r.keys?.[0] ?? '';
  let path = url; try { path = new URL(url).pathname; } catch {}
  console.log(`  ${(i + 1).toString().padStart(2)}. [pos ${pos(r.position).padStart(5)}] [ctr ${pct(r.ctr).padStart(6)}] ${fmtN(r.clicks).padStart(4)} clk / ${fmtN(r.impressions).padStart(6)} imp  ${path}`);
});
console.log();

console.log('DEVICE');
devices.forEach((r) => {
  console.log(`  ${(r.keys?.[0] ?? '?').padEnd(8)} ${fmtN(r.clicks).padStart(5)} clk / ${fmtN(r.impressions).padStart(6)} imp  ctr=${pct(r.ctr)} pos=${pos(r.position)}`);
});
console.log();

console.log('TOP COUNTRIES');
countries.slice(0, 5).forEach((r) => {
  console.log(`  ${(r.keys?.[0] ?? '?').toUpperCase().padEnd(4)} ${fmtN(r.clicks).padStart(5)} clk / ${fmtN(r.impressions).padStart(6)} imp`);
});

process.exit(0);
