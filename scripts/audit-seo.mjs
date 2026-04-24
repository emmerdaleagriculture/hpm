#!/usr/bin/env node
/**
 * SEO audit script.
 *
 * For every known URL on the site, fetch the raw HTML and pull out:
 *   - <title>
 *   - meta description
 *   - canonical
 *   - OpenGraph tags
 *   - h1/h2 structure
 *   - any JSON-LD schema
 *   - detected SEO plugin signature
 *
 * Output:
 *   extracted/seo/by-url.json    - full metadata per URL
 *   extracted/seo/inventory.csv  - spreadsheet of URL -> title, description
 *   extracted/seo/redirects.csv  - starter redirect map (old URL -> new URL)
 *
 * Run AFTER extract.mjs — it reads manifest.json to know which URLs to audit.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const SITE = 'https://hampshirepaddockmanagement.com';
const OUT = './extracted/seo';

// --- helpers ---

async function fetchHtml(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'hpm-seo-audit/1.0' } });
  if (!r.ok) return { ok: false, status: r.status, html: '' };
  return { ok: true, status: r.status, html: await r.text() };
}

// Lightweight regex-based extraction. Good enough for WP-generated HTML
// and avoids pulling in a full DOM parser dependency.
function extractMeta(html) {
  const pick = (re) => {
    const m = html.match(re);
    return m ? m[1].trim() : null;
  };

  const title = pick(/<title[^>]*>([^<]*)<\/title>/i);
  const description = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const canonical = pick(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  const ogTitle = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  const ogDescription = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);
  const ogImage = pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i);
  const robots = pick(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i);

  // Headings
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').trim()
  );
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').trim()
  );

  // JSON-LD blocks
  const jsonLd = [...html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )]
    .map((m) => {
      try {
        return JSON.parse(m[1].trim());
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  // Detect SEO plugin signature in the HTML
  let seoPlugin = null;
  if (/yoast/i.test(html)) seoPlugin = 'Yoast';
  else if (/rank-math|rank_math/i.test(html)) seoPlugin = 'Rank Math';
  else if (/all-in-one-seo|aioseo/i.test(html)) seoPlugin = 'All in One SEO';
  else if (/seopress/i.test(html)) seoPlugin = 'SEOPress';

  return {
    title,
    description,
    canonical,
    robots,
    og: { title: ogTitle, description: ogDescription, image: ogImage },
    h1: h1s,
    h2: h2s,
    jsonLd,
    seoPlugin,
  };
}

// CSV escaping
const csv = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// --- main ---

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  // Load the manifest produced by extract.mjs
  const manifestPath = './extracted/manifest.json';
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch {
    console.error('Could not read extracted/manifest.json — run `npm run extract` first.');
    process.exit(1);
  }

  // Build the URL list: pages + posts + the known top-level paths
  const urls = new Set();

  // Home
  urls.add(SITE + '/');

  // Every page's permalink
  for (const p of manifest.pages || []) {
    if (p.link && p.status === 'publish') urls.add(p.link);
  }
  // Every post's permalink
  for (const p of manifest.posts || []) {
    if (p.link && p.status === 'publish') urls.add(p.link);
  }

  console.log(`Auditing ${urls.size} URLs...\n`);

  const results = [];
  let i = 0;
  for (const url of urls) {
    i += 1;
    process.stdout.write(`  [${i}/${urls.size}] ${url} ... `);
    try {
      const { ok, status, html } = await fetchHtml(url);
      if (!ok) {
        console.log(`FAIL (${status})`);
        results.push({ url, status, error: true });
        continue;
      }
      const meta = extractMeta(html);
      results.push({ url, status, ...meta });
      console.log('ok');
    } catch (e) {
      console.log(`ERROR ${e.message}`);
      results.push({ url, error: e.message });
    }
    // Gentle rate limit — we own the server but no need to hammer it
    await new Promise((r) => setTimeout(r, 200));
  }

  // Write full JSON
  await fs.writeFile(
    path.join(OUT, 'by-url.json'),
    JSON.stringify(results, null, 2)
  );

  // Write CSV inventory
  const csvLines = [
    ['url', 'status', 'title', 'description', 'canonical', 'robots', 'h1', 'seoPlugin'].join(','),
    ...results.map((r) =>
      [
        r.url,
        r.status,
        r.title,
        r.description,
        r.canonical,
        r.robots,
        (r.h1 || []).join(' | '),
        r.seoPlugin,
      ].map(csv).join(',')
    ),
  ];
  await fs.writeFile(path.join(OUT, 'inventory.csv'), csvLines.join('\n'));

  // Starter redirect map — default rule is "new path === old path".
  // We fill in the "new_url" column for any URL that will change.
  const redirectLines = [
    ['old_url', 'new_url', 'status_code', 'notes'].join(','),
    ...results.map((r) => {
      const oldPath = (() => {
        try {
          return new URL(r.url).pathname;
        } catch {
          return r.url;
        }
      })();
      // Default: same path on new site. We override for URLs that need to change.
      return [oldPath, oldPath, 301, ''].map(csv).join(',');
    }),
  ];
  await fs.writeFile(path.join(OUT, 'redirects.csv'), redirectLines.join('\n'));

  // Summary
  const summary = {
    audited_at: new Date().toISOString(),
    total_urls: results.length,
    ok: results.filter((r) => r.status === 200).length,
    non_200: results.filter((r) => r.status && r.status !== 200).length,
    errors: results.filter((r) => r.error).length,
    detected_seo_plugin: results.find((r) => r.seoPlugin)?.seoPlugin || 'none detected',
    has_canonical: results.filter((r) => r.canonical).length,
    has_meta_description: results.filter((r) => r.description).length,
    has_json_ld: results.filter((r) => (r.jsonLd || []).length > 0).length,
  };
  await fs.writeFile(
    path.join(OUT, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log('\nDone.');
  console.log(`  extracted/seo/by-url.json    - full metadata`);
  console.log(`  extracted/seo/inventory.csv  - spreadsheet`);
  console.log(`  extracted/seo/redirects.csv  - fill in new_url where paths change`);
  console.log(`  extracted/seo/summary.json   - quick stats`);
  console.log(`\nSummary: ${JSON.stringify(summary, null, 2)}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
