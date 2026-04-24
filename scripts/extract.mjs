#!/usr/bin/env node
/**
 * WordPress content extraction script.
 *
 * Pulls pages, posts, media, categories, tags, and menus from a WordPress
 * site's REST API into a local ./extracted/ directory.
 *
 * Usage:
 *   node scripts/extract.mjs
 *
 * Output:
 *   extracted/
 *     pages/        - one JSON file per page
 *     posts/        - one JSON file per post
 *     media/        - downloaded media files (images, etc.)
 *     raw/          - raw API responses (useful for debugging)
 *     manifest.json - summary of everything extracted
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

const SITE = 'https://hampshirepaddockmanagement.com';
const OUT = './extracted';
const API = `${SITE}/wp-json/wp/v2`;

// --- helpers ---

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

async function fetchJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'hpm-migration/1.0' } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return r.json();
}

/**
 * Fetch every page of a paginated WP REST endpoint.
 * WordPress returns total pages in the X-WP-TotalPages header.
 */
async function fetchAll(endpoint) {
  const results = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `${API}/${endpoint}?per_page=${perPage}&page=${page}&_embed=true`;
    const r = await fetch(url, { headers: { 'User-Agent': 'hpm-migration/1.0' } });

    if (r.status === 400) break; // past the last page
    if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);

    const batch = await r.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    results.push(...batch);
    const totalPages = Number(r.headers.get('x-wp-totalpages') || 1);
    console.log(`  ${endpoint}: page ${page}/${totalPages} (+${batch.length})`);
    if (page >= totalPages) break;
    page += 1;
  }

  return results;
}

async function downloadFile(url, destPath) {
  const r = await fetch(url);
  if (!r.ok) {
    console.warn(`  ! Failed to download ${url} (${r.status})`);
    return false;
  }
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await pipeline(r.body, createWriteStream(destPath));
  return true;
}

// --- main ---

async function main() {
  console.log(`Extracting from ${SITE}\n`);

  // Ensure output directories exist
  for (const sub of ['pages', 'posts', 'media', 'raw']) {
    await fs.mkdir(path.join(OUT, sub), { recursive: true });
  }

  // 1. Pages
  console.log('Fetching pages...');
  const pages = await fetchAll('pages');
  await fs.writeFile(path.join(OUT, 'raw', 'pages.json'), JSON.stringify(pages, null, 2));
  for (const p of pages) {
    const slug = p.slug || slugify(p.title?.rendered || String(p.id));
    await fs.writeFile(
      path.join(OUT, 'pages', `${slug}.json`),
      JSON.stringify(p, null, 2)
    );
  }
  console.log(`  -> ${pages.length} pages\n`);

  // 2. Posts
  console.log('Fetching posts...');
  const posts = await fetchAll('posts');
  await fs.writeFile(path.join(OUT, 'raw', 'posts.json'), JSON.stringify(posts, null, 2));
  for (const p of posts) {
    const slug = p.slug || slugify(p.title?.rendered || String(p.id));
    await fs.writeFile(
      path.join(OUT, 'posts', `${slug}.json`),
      JSON.stringify(p, null, 2)
    );
  }
  console.log(`  -> ${posts.length} posts\n`);

  // 3. Categories & tags (useful for the blog)
  console.log('Fetching taxonomies...');
  const categories = await fetchAll('categories').catch(() => []);
  const tags = await fetchAll('tags').catch(() => []);
  await fs.writeFile(path.join(OUT, 'raw', 'categories.json'), JSON.stringify(categories, null, 2));
  await fs.writeFile(path.join(OUT, 'raw', 'tags.json'), JSON.stringify(tags, null, 2));
  console.log(`  -> ${categories.length} categories, ${tags.length} tags\n`);

  // 4. Media
  console.log('Fetching media library...');
  const media = await fetchAll('media');
  await fs.writeFile(path.join(OUT, 'raw', 'media.json'), JSON.stringify(media, null, 2));
  console.log(`  -> ${media.length} media items indexed\n`);

  console.log('Downloading media files...');
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const m of media) {
    const url = m.source_url;
    if (!url) continue;
    const urlPath = new URL(url).pathname;
    // Preserve /wp-content/uploads/YYYY/MM/filename.ext structure
    const dest = path.join(OUT, 'media', urlPath.replace(/^\//, ''));

    try {
      await fs.access(dest);
      skipped += 1;
    } catch {
      const ok = await downloadFile(url, dest);
      if (ok) {
        downloaded += 1;
        if (downloaded % 10 === 0) console.log(`  ${downloaded} files downloaded...`);
      } else {
        failed += 1;
      }
    }
  }
  console.log(`  -> ${downloaded} new, ${skipped} already present, ${failed} failed\n`);

  // 5. Menus (falls back gracefully if endpoint is absent)
  console.log('Fetching menu structure...');
  try {
    const menus = await fetchJson(`${SITE}/wp-json/wp-api-menus/v2/menus`);
    await fs.writeFile(path.join(OUT, 'raw', 'menus.json'), JSON.stringify(menus, null, 2));
    console.log(`  -> menus saved`);
  } catch {
    console.log('  -> menu endpoint not exposed (that is fine, we will rebuild the nav manually)');
  }
  console.log('');

  // 6. Manifest
  const manifest = {
    extracted_at: new Date().toISOString(),
    site: SITE,
    counts: {
      pages: pages.length,
      posts: posts.length,
      categories: categories.length,
      tags: tags.length,
      media_indexed: media.length,
      media_downloaded: downloaded,
      media_skipped: skipped,
      media_failed: failed,
    },
    pages: pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title?.rendered,
      link: p.link,
      parent: p.parent,
      status: p.status,
      modified: p.modified,
    })),
    posts: posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title?.rendered,
      link: p.link,
      date: p.date,
      status: p.status,
    })),
  };
  await fs.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log('Done. See extracted/manifest.json for a summary.');
}

main().catch((err) => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
