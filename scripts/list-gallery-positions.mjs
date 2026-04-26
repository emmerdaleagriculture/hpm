#!/usr/bin/env node
/**
 * scripts/list-gallery-positions.mjs
 *
 * Read-only. Lists media in the same order the public /gallery page
 * shows them (sort: -createdAt, mimeType contains 'image/'), so you
 * can map a "gallery position" (1-indexed) back to a media id.
 *
 * Usage:
 *   node scripts/list-gallery-positions.mjs
 *   node scripts/list-gallery-positions.mjs --positions=4,5,6,49
 *   DATABASE_URL=$DATABASE_URL_PROD node scripts/list-gallery-positions.mjs
 */

import { getPayload } from 'payload';
import config from '../src/payload/payload.config.ts';

const args = process.argv.slice(2);
const POS_ARG = args.find((a) => a.startsWith('--positions='))?.slice(12);
const wantPositions = POS_ARG
  ? new Set(POS_ARG.split(',').map((s) => Number(s.trim())).filter(Number.isFinite))
  : null;

const payload = await getPayload({ config });

const res = await payload.find({
  collection: 'media',
  where: { mimeType: { contains: 'image/' } },
  sort: '-createdAt',
  limit: 0,
  depth: 0,
});

console.log(`Total gallery images: ${res.docs.length}`);
console.log('pos\tid\tfilename');

res.docs.forEach((m, i) => {
  const pos = i + 1;
  if (wantPositions && !wantPositions.has(pos)) return;
  console.log(`${pos}\t${m.id}\t${m.filename ?? ''}`);
});

process.exit(0);
