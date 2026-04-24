#!/usr/bin/env node
/**
 * scripts/import-from-wp.mjs
 *
 * Imports content from the WordPress extraction (extracted/) into Payload CMS.
 *
 * Usage:
 *   node scripts/import-from-wp.mjs                   # dry-run (default)
 *   node scripts/import-from-wp.mjs --execute         # actually write
 *   node scripts/import-from-wp.mjs --stage=media     # one stage only
 *   node scripts/import-from-wp.mjs --execute --stage=services
 *
 * Flags:
 *   --execute              Actually write to Payload. Without this, nothing writes.
 *   --stage=<name>         Run only one stage. One of:
 *                          media | services | pages | posts | globals | redirects
 *   --clean                Wipe non-user collections before importing (DESTRUCTIVE)
 *   --force                Rewrite content on existing pages/services/posts
 *                          (updates content field only — preserves other edits)
 *   --limit=<n>            Only import first N items per stage (for testing)
 *   --verbose              Extra logging
 *
 * Idempotency: the script looks up existing records by slug (or wpId) before
 * creating, so re-running is safe. Pass --clean to wipe first.
 */

import { getPayload } from 'payload';
import config from '../src/payload/payload.config.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const EXTRACTED = path.join(ROOT, 'extracted');

// ---------------------------------------------------------------------------
// CONFIG: slugs that should go into the `services` collection, not `pages`
// ---------------------------------------------------------------------------
const SERVICE_SLUGS = new Set([
  'dung-sweeping',
  'fertiliser-spraying',
  'field-harrowing',
  'field-ploughing',
  'field-rotavating',
  'hedge-cutting',
  'overseeding',
  'paddock-rolling',
  'paddock-topping',
  'ragwort-pulling',
  'seedsight',
]);

// Slugs to skip entirely (WooCommerce artifacts, Elementor templates, etc.)
const SKIP_SLUGS = new Set([
  'cart',
  'checkout',
  'my-account',
  'shop',
  'wishlist',
  'products-compare',
  'fixed-contact-form',
  'footer-separator-row',
]);

// ---------------------------------------------------------------------------
// CLI ARGS
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name) => args.some((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const valueOf = (name) => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
};

const EXECUTE = flag('execute');
const STAGE = valueOf('stage'); // null = all stages
const CLEAN = flag('clean');
const FORCE = flag('force'); // rewrite content on existing pages/services/posts
const LIMIT = valueOf('limit') ? parseInt(valueOf('limit'), 10) : null;
const VERBOSE = flag('verbose');

const log = (...a) => console.log(...a);
const vlog = (...a) => { if (VERBOSE) console.log('  ', ...a); };
const warn = (...a) => console.warn('  ⚠️ ', ...a);

// ---------------------------------------------------------------------------
// HTML CLEANER (same as clean-wp-html.mjs, inlined for single-file tidiness)
// ---------------------------------------------------------------------------
const UNWRAP_TAGS = new Set([
  'div', 'section', 'span', 'article', 'aside', 'header', 'footer',
  'main', 'nav', 'form',
]);
const DROP_TAGS = new Set([
  'script', 'style', 'noscript', 'iframe', 'embed', 'object',
  'button', 'input', 'select', 'textarea', 'label',
  'svg', 'canvas', 'video', 'audio',
]);
const KEEP_ATTRS = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'title', 'width', 'height'],
};

function cleanWPContent(html) {
  const $ = cheerio.load(`<div id="__root">${html}</div>`, { decodeEntities: false });
  const root = $('#__root');

  root.find('*').each((_, el) => {
    if (DROP_TAGS.has(el.tagName)) $(el).remove();
  });

  let changed = true;
  let passes = 0;
  while (changed && passes < 20) {
    changed = false;
    passes++;
    root.find('*').each((_, el) => {
      if (UNWRAP_TAGS.has(el.tagName)) {
        const $el = $(el);
        const cls = $el.attr('class') || '';
        if (cls.includes('cz_image_caption') || cls.includes('wp-caption-text')) {
          const text = $el.text().trim();
          if (text) $el.replaceWith(`<figcaption>${text}</figcaption>`);
          else $el.remove();
          changed = true;
          return;
        }
        $el.replaceWith($el.contents());
        changed = true;
      }
    });
  }

  root.find('*').each((_, el) => {
    const keep = KEEP_ATTRS[el.tagName] || [];
    for (const attr of Object.keys({ ...el.attribs })) {
      if (!keep.includes(attr)) $(el).removeAttr(attr);
    }
  });

  const images = [];
  root.find('img').each((_, el) => {
    images.push({
      src: $(el).attr('src') || '',
      alt: $(el).attr('alt') || '',
    });
  });

  root.find('p').each((_, el) => {
    const $el = $(el);
    if ($el.text().trim() === '' && $el.find('img').length === 0) $el.remove();
  });
  root.find('br + br').remove();
  root.find('strong, em, b, i, u').each((_, el) => {
    const $el = $(el);
    if ($el.text().trim() === '' && $el.find('img').length === 0) $el.remove();
  });

  // Dedupe adjacent images
  const seenSrcs = [];
  root.find('img').each((_, el) => {
    const src = $(el).attr('src');
    if (seenSrcs[seenSrcs.length - 1] === src) $(el).remove();
    else seenSrcs.push(src);
  });
  const seenArr = new Set();
  const deduped = [];
  for (const img of images) {
    const k = img.src + '|' + img.alt;
    if (!seenArr.has(k)) { seenArr.add(k); deduped.push(img); }
  }

  // Strip decorative bits
  root.find('p, span').each((_, el) => {
    const t = $(el).text().trim();
    if (t === '_' || t === '—' || t === '–') $(el).remove();
  });

  // Eyebrow pattern: short <p> before heading
  root.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
    try {
      const prev = $(el).prev();
      if (prev.length && prev[0] && prev[0].tagName === 'p') {
        const text = prev.text().trim();
        if (text.length > 0 && text.length < 80 && !text.endsWith(':')) prev.remove();
      }
    } catch {
      // Some WP/Elementor DOM shapes trip cheerio's prev() traversal. Skip silently.
    }
  });

  let out = root.html() || '';
  out = out
    .replace(/[\t]+/g, '')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .replace(/>\s+</g, '><')
    .replace(/<(p|h[1-6]|li|figcaption)>\s+/g, '<$1>')
    .replace(/\s+<\/(p|h[1-6]|li|figcaption)>/g, '</$1>')
    .replace(/>[\s]*_[\s]*</g, '><')
    .trim();

  return { html: out, images: deduped };
}

// ---------------------------------------------------------------------------
// HTML → Lexical conversion
// Payload 3 uses Lexical for rich text. Rather than pulling in a full
// HTML-to-Lexical library, we generate a minimal Lexical document with
// paragraph, heading, list, and image nodes. This covers 95% of WP content.
// ---------------------------------------------------------------------------
function htmlToLexical(html, mediaMap = {}) {
  const $ = cheerio.load(`<div id="__root">${html}</div>`, { decodeEntities: false });
  const root = $('#__root');

  const children = [];

  root.children().each((_, el) => {
    const node = convertNode($, el, mediaMap);
    if (node) children.push(node);
  });

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: children.length ? children : [emptyParagraph()],
    },
  };
}

function emptyParagraph() {
  return {
    type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr', children: [],
  };
}

function convertNode($, el, mediaMap) {
  const tag = el.tagName;

  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
    return {
      type: 'heading',
      tag,
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: convertInline($, el, mediaMap),
    };
  }

  if (tag === 'p') {
    return {
      type: 'paragraph',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: convertInline($, el, mediaMap),
    };
  }

  if (tag === 'ul' || tag === 'ol') {
    const items = [];
    $(el).children('li').each((_, li) => {
      items.push({
        type: 'listitem',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        value: items.length + 1,
        children: convertInline($, li, mediaMap),
      });
    });
    return {
      type: 'list',
      listType: tag === 'ol' ? 'number' : 'bullet',
      tag,
      start: 1,
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: items,
    };
  }

  if (tag === 'img') {
    const src = $(el).attr('src');
    const alt = $(el).attr('alt') || '';
    // Direct match, then try stripping the WP srcset "-WIDTHxHEIGHT" suffix
    // (e.g. .../Paddock-Grass-300x207.png → .../Paddock-Grass.png).
    let mediaId = mediaMap[src];
    if (!mediaId && src) {
      const base = src.replace(/-\d+x\d+(\.[a-zA-Z0-9]+)(?:\?.*)?$/, '$1');
      if (base !== src) mediaId = mediaMap[base];
    }
    if (mediaId) {
      return {
        type: 'upload',
        format: '',
        version: 2,
        relationTo: 'media',
        value: { id: mediaId },
      };
    }
    // Fallback: inline image without rewire — record as warning
    warn(`Image not in mediaMap: ${src}`);
    return {
      type: 'paragraph',
      format: '', indent: 0, version: 1, direction: 'ltr',
      children: [{ type: 'text', text: `[unresolved image: ${alt || src}]`, format: 0, version: 1, detail: 0, mode: 'normal', style: '' }],
    };
  }

  if (tag === 'blockquote') {
    return {
      type: 'quote',
      format: '', indent: 0, version: 1, direction: 'ltr',
      children: convertInline($, el, mediaMap),
    };
  }

  if (tag === 'figcaption') {
    // Attach as paragraph with italic formatting
    return {
      type: 'paragraph',
      format: '', indent: 0, version: 1, direction: 'ltr',
      children: [{
        type: 'text',
        text: $(el).text().trim(),
        format: 2, // italic
        version: 1, detail: 0, mode: 'normal', style: '',
      }],
    };
  }

  if (tag === 'hr') {
    return { type: 'horizontalrule', version: 1 };
  }

  // Unknown block — try to extract text
  const text = $(el).text().trim();
  if (text) {
    return {
      type: 'paragraph',
      format: '', indent: 0, version: 1, direction: 'ltr',
      children: [{ type: 'text', text, format: 0, version: 1, detail: 0, mode: 'normal', style: '' }],
    };
  }
  return null;
}

function convertInline($, parentEl, mediaMap) {
  const out = [];
  $(parentEl).contents().each((_, node) => {
    if (node.type === 'text') {
      const text = $(node).text();
      if (text) {
        out.push({
          type: 'text', text,
          format: 0, version: 1, detail: 0, mode: 'normal', style: '',
        });
      }
      return;
    }
    if (node.type !== 'tag') return;

    const tag = node.tagName;
    if (tag === 'strong' || tag === 'b') {
      out.push(...convertInline($, node, mediaMap).map((c) => ({ ...c, format: (c.format || 0) | 1 })));
    } else if (tag === 'em' || tag === 'i') {
      out.push(...convertInline($, node, mediaMap).map((c) => ({ ...c, format: (c.format || 0) | 2 })));
    } else if (tag === 'u') {
      out.push(...convertInline($, node, mediaMap).map((c) => ({ ...c, format: (c.format || 0) | 8 })));
    } else if (tag === 'a') {
      const href = ($(node).attr('href') || '').trim();
      const inner = convertInline($, node, mediaMap);
      if (!href) {
        // Broken link — surface as plain text so Lexical doesn't reject it
        out.push(...inner);
      } else {
        out.push({
          type: 'link',
          fields: { url: href, newTab: false, linkType: 'custom' },
          format: '', indent: 0, version: 3, direction: 'ltr',
          children: inner,
        });
      }
    } else if (tag === 'br') {
      out.push({ type: 'linebreak', version: 1 });
    } else if (tag === 'img') {
      // Inline image — treated same as block for now
      const n = convertNode($, node, mediaMap);
      if (n) out.push(n);
    } else {
      // Unknown inline — treat contents as plain text
      const text = $(node).text();
      if (text) {
        out.push({ type: 'text', text, format: 0, version: 1, detail: 0, mode: 'normal', style: '' });
      }
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// STAGE 1: MEDIA
// ---------------------------------------------------------------------------
async function importMedia(payload, state) {
  log('\n=== STAGE: MEDIA ===');
  const mediaJsonPath = path.join(EXTRACTED, 'raw', 'media.json');
  const rawMedia = JSON.parse(await fs.readFile(mediaJsonPath, 'utf-8'));

  const items = LIMIT ? rawMedia.slice(0, LIMIT) : rawMedia;
  log(`Found ${rawMedia.length} media items (processing ${items.length}).`);

  let created = 0, skipped = 0, failed = 0;

  for (const item of items) {
    const sourceUrl = item.source_url;
    // Extract relative path under wp-content/uploads
    const match = sourceUrl.match(/\/wp-content\/uploads\/(.+)$/);
    if (!match) {
      warn(`Weird URL, skipping: ${sourceUrl}`);
      failed++;
      continue;
    }
    const relPath = match[1];
    const localPath = path.join(EXTRACTED, 'media', 'wp-content', 'uploads', relPath);

    try {
      await fs.access(localPath);
    } catch {
      warn(`Local file missing: ${localPath}`);
      failed++;
      continue;
    }

    // Check for existing record by wpId
    const existing = await payload.find({
      collection: 'media',
      where: { wpId: { equals: item.id } },
      limit: 1,
    });
    if (existing.docs.length > 0) {
      state.mediaMap.set(item.id, existing.docs[0].id);
      state.urlMap.set(sourceUrl, existing.docs[0].id);
      // Also map all srcset variants if srcset is in original
      skipped++;
      vlog(`skip (exists): ${relPath}`);
      continue;
    }

    if (!EXECUTE) {
      vlog(`would create: ${relPath} (${item.alt_text ? 'with alt' : 'no alt'})`);
      state.mediaMap.set(item.id, `DRY-${item.id}`);
      state.urlMap.set(sourceUrl, `DRY-${item.id}`);
      created++;
      continue;
    }

    try {
      const fileBuffer = await fs.readFile(localPath);
      const filename = path.basename(localPath);
      const mime = mimeFromExt(path.extname(filename));

      const altText =
        (item.alt_text && item.alt_text.trim()) ||
        (item.title && item.title.rendered && decodeEntities(item.title.rendered).trim()) ||
        path.basename(filename, path.extname(filename)).replace(/[-_]+/g, ' ').trim();

      const result = await payload.create({
        collection: 'media',
        data: {
          alt: altText,
          wpId: item.id,
          wpUrl: sourceUrl,
        },
        file: {
          data: fileBuffer,
          mimetype: mime,
          name: filename,
          size: fileBuffer.length,
        },
      });
      state.mediaMap.set(item.id, result.id);
      state.urlMap.set(sourceUrl, result.id);
      created++;
      if (created % 10 === 0) log(`  ${created} media uploaded...`);
    } catch (err) {
      warn(`Failed: ${relPath} — ${err.message}`);
      failed++;
    }
  }

  log(`Media: ${created} created, ${skipped} skipped (exists), ${failed} failed.`);
}

function mimeFromExt(ext) {
  const e = ext.toLowerCase();
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.png') return 'image/png';
  if (e === '.gif') return 'image/gif';
  if (e === '.webp') return 'image/webp';
  if (e === '.svg') return 'image/svg+xml';
  if (e === '.pdf') return 'application/pdf';
  if (e === '.mp4') return 'video/mp4';
  return 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// STAGE 2/3: SERVICES + PAGES (shared logic, routed by slug)
// ---------------------------------------------------------------------------
async function importPages(payload, state) {
  log('\n=== STAGE: SERVICES + PAGES ===');
  const pagesDir = path.join(EXTRACTED, 'pages');
  const files = await fs.readdir(pagesDir);

  const items = LIMIT ? files.slice(0, LIMIT) : files;
  log(`Found ${files.length} page files (processing ${items.length}).`);

  let services = 0, pages = 0, skipped = 0, failed = 0;

  for (const file of items) {
    const slug = file.replace(/\.json$/, '');
    if (SKIP_SLUGS.has(slug)) {
      vlog(`skip (blacklist): ${slug}`);
      skipped++;
      continue;
    }

    const data = JSON.parse(await fs.readFile(path.join(pagesDir, file), 'utf-8'));
    const isService = SERVICE_SLUGS.has(slug);
    const collection = isService ? 'services' : 'pages';

    try {
      // Check existing
      const existing = await payload.find({
        collection,
        where: { slug: { equals: slug } },
        limit: 1,
      });
      const existingDoc = existing.docs[0];
      if (existingDoc && !FORCE) {
        state[isService ? 'serviceMap' : 'pageMap'].set(data.id, existingDoc.id);
        vlog(`skip (exists): ${collection}/${slug}`);
        skipped++;
        continue;
      }

      const title = decodeEntities(data.title.rendered);
      const { html, images } = cleanWPContent(data.content.rendered);
      const lexical = htmlToLexical(html, Object.fromEntries(state.urlMap));
      // `content` is a blocks field. Wrap the converted lexical in a
      // richText block so Payload actually stores it.
      const contentBlocks = [{ blockType: 'richText', content: lexical }];

      const payloadData = {
        title,
        slug,
        wpId: data.id,
        content: contentBlocks,
        _status: 'published',
      };
      // seo.metaTitle, seo.metaDescription, and services.shortDescription are
      // populated automatically by the autoDerive beforeValidate hook on each
      // collection — no need to set them here.

      if (!EXECUTE) {
        vlog(`would ${existingDoc ? 'update' : 'create'}: ${collection}/${slug} (${images.length} images)`);
        state[isService ? 'serviceMap' : 'pageMap'].set(data.id, existingDoc ? existingDoc.id : `DRY-${data.id}`);
        if (isService) services++; else pages++;
        continue;
      }

      let result;
      if (existingDoc) {
        result = await payload.update({
          collection,
          id: existingDoc.id,
          data: { content: contentBlocks, _status: 'published' },
        });
        log(`  updated ${collection}/${slug} (content only)`);
      } else {
        result = await payload.create({ collection, data: payloadData });
        log(`  created ${collection}/${slug}`);
      }
      state[isService ? 'serviceMap' : 'pageMap'].set(data.id, result.id);
      if (isService) services++; else pages++;
    } catch (err) {
      warn(`Failed: ${slug} — ${err.message}`);
      if (VERBOSE) console.error(err);
      failed++;
    }
  }

  log(`Services: ${services} created.  Pages: ${pages} created.  Skipped: ${skipped}.  Failed: ${failed}.`);
}

// ---------------------------------------------------------------------------
// STAGE 4: POSTS
// ---------------------------------------------------------------------------
async function importPosts(payload, state) {
  log('\n=== STAGE: POSTS ===');
  const postsDir = path.join(EXTRACTED, 'posts');
  const files = await fs.readdir(postsDir);

  // Build WP tag id → name lookup. Used to populate each post's tags field.
  let wpTagMap = new Map();
  try {
    const rawTags = JSON.parse(await fs.readFile(path.join(EXTRACTED, 'raw', 'tags.json'), 'utf-8'));
    for (const t of rawTags) wpTagMap.set(t.id, decodeEntities(t.name));
    vlog(`loaded ${wpTagMap.size} WP tags`);
  } catch (err) {
    warn(`Could not load WP tags: ${err.message}`);
  }

  const items = LIMIT ? files.slice(0, LIMIT) : files;
  log(`Found ${files.length} posts (processing ${items.length}).`);

  let created = 0, skipped = 0, failed = 0;

  for (const file of items) {
    const slug = file.replace(/\.json$/, '');
    const data = JSON.parse(await fs.readFile(path.join(postsDir, file), 'utf-8'));

    try {
      const existing = await payload.find({
        collection: 'posts',
        where: { slug: { equals: slug } },
        limit: 1,
      });
      const existingDoc = existing.docs[0];
      if (existingDoc && !FORCE) {
        state.postMap.set(data.id, existingDoc.id);
        vlog(`skip (exists): ${slug}`);
        skipped++;
        continue;
      }

      const title = decodeEntities(data.title.rendered);
      const { html, images } = cleanWPContent(data.content.rendered);
      const lexical = htmlToLexical(html, Object.fromEntries(state.urlMap));
      const contentBlocks = [{ blockType: 'richText', content: lexical }];

      const featuredMediaId = data.featured_media ? state.mediaMap.get(data.featured_media) : null;

      // Prefer the WP excerpt if present; otherwise the autoDerive hook will
      // fall back to the body content. SEO is populated by the hook too.
      const wpExcerpt = decodeEntities(stripTags(data.excerpt.rendered)).trim();
      // Map WP tag ids → Payload tags array. Posts with no WP tags fall
      // through to the autoDerive hook's content-keyword fallback.
      const wpTags = Array.isArray(data.tags)
        ? data.tags.map((id) => wpTagMap.get(id)).filter(Boolean).map((tag) => ({ tag }))
        : [];
      const payloadData = {
        title,
        slug,
        wpId: data.id,
        content: contentBlocks,
        publishedAt: data.date,
        _status: 'published',
        ...(wpExcerpt ? { excerpt: wpExcerpt } : {}),
        ...(wpTags.length ? { tags: wpTags } : {}),
      };
      if (featuredMediaId && featuredMediaId !== undefined) {
        payloadData.heroImage = featuredMediaId;
      }

      if (!EXECUTE) {
        vlog(`would ${existingDoc ? 'update' : 'create'} post: ${slug} (${images.length} images)`);
        state.postMap.set(data.id, existingDoc ? existingDoc.id : `DRY-${data.id}`);
        created++;
        continue;
      }

      let result;
      if (existingDoc) {
        result = await payload.update({
          collection: 'posts',
          id: existingDoc.id,
          data: {
            content: contentBlocks,
            _status: 'published',
            ...(wpTags.length ? { tags: wpTags } : {}),
          },
        });
      } else {
        result = await payload.create({ collection: 'posts', data: payloadData });
      }
      state.postMap.set(data.id, result.id);
      created++;
      if (created % 10 === 0) log(`  ${created} posts processed...`);
    } catch (err) {
      warn(`Failed: ${slug} — ${err.message}`);
      if (VERBOSE) console.error(err);
      failed++;
    }
  }

  log(`Posts: ${created} created, ${skipped} skipped, ${failed} failed.`);
}

// ---------------------------------------------------------------------------
// STAGE 5: GLOBALS (homepage + site-settings)
// ---------------------------------------------------------------------------
async function importGlobals(payload, state) {
  log('\n=== STAGE: GLOBALS ===');

  // Homepage: find the page marked as front page (usually slug 'home')
  const homePath = path.join(EXTRACTED, 'pages', 'home.json');
  try {
    const homeData = JSON.parse(await fs.readFile(homePath, 'utf-8'));
    const { html } = cleanWPContent(homeData.content.rendered);
    const lexical = htmlToLexical(html, Object.fromEntries(state.urlMap));

    // WP had the literal title "Home" which is useless for SEO. Use a
    // descriptive default; Tom can refine in admin.
    const wpTitle = decodeEntities(homeData.title.rendered);
    const heroHeading =
      wpTitle && wpTitle.trim().toLowerCase() !== 'home'
        ? wpTitle
        : 'Hampshire Paddock Management — paddock topping, harrowing & rolling across Hampshire';

    if (!EXECUTE) {
      log('  would update homepage global from home.json');
    } else {
      await payload.updateGlobal({
        slug: 'homepage',
        data: {
          hero: { heading: heroHeading },
          content: [{ blockType: 'richText', content: lexical }],
        },
      });
      log('  homepage global updated');
    }
  } catch (err) {
    warn(`Homepage global: ${err.message}`);
  }

  // Site settings — the schema already has defaults for business.* fields
  // (legalName, tradingName, companyNumber, phone, email, serviceAreas etc.),
  // so there's nothing to import from WP here. Tom edits in admin.
  vlog('site-settings: skipping — schema defaults already populate business info');
}

// ---------------------------------------------------------------------------
// STAGE 6: REDIRECTS
// ---------------------------------------------------------------------------
async function importRedirects(payload, state) {
  log('\n=== STAGE: REDIRECTS ===');
  // TODO: read from Phase 1b audit output. For now, seed the known must-haves:
  // WooCommerce pages → home, old URLs → new URLs.
  const redirects = [
    // WooCommerce pages we're not carrying over
    { from: '/cart', to: '/', statusCode: '301' },
    { from: '/checkout', to: '/', statusCode: '301' },
    { from: '/my-account', to: '/', statusCode: '301' },
    { from: '/shop', to: '/services', statusCode: '301' },
    { from: '/wishlist', to: '/', statusCode: '301' },
    { from: '/products-compare', to: '/', statusCode: '301' },
    // Future: WP category/tag archive patterns, dated post URLs, etc.
  ];

  let created = 0, skipped = 0;
  for (const r of redirects) {
    try {
      const existing = await payload.find({
        collection: 'redirects',
        where: { from: { equals: r.from } },
        limit: 1,
      });
      if (existing.docs.length > 0) {
        vlog(`skip (exists): ${r.from}`);
        skipped++;
        continue;
      }
      if (!EXECUTE) {
        vlog(`would create: ${r.from} → ${r.to}`);
        created++;
        continue;
      }
      await payload.create({ collection: 'redirects', data: r });
      created++;
    } catch (err) {
      warn(`Redirect ${r.from}: ${err.message}`);
    }
  }
  log(`Redirects: ${created} created, ${skipped} skipped.`);
}

// ---------------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------------
function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8230;/g, '…')
    .replace(/&nbsp;/g, ' ');
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').trim();
}

// ---------------------------------------------------------------------------
// CLEAN (nuke collections before import — DESTRUCTIVE)
// ---------------------------------------------------------------------------
async function cleanCollections(payload) {
  log('\n=== CLEAN: wiping non-user collections ===');
  if (!EXECUTE) {
    log('  (dry-run — nothing deleted)');
    return;
  }
  const toClean = ['media', 'pages', 'services', 'posts', 'redirects'];
  for (const coll of toClean) {
    try {
      const all = await payload.find({ collection: coll, limit: 10000, depth: 0 });
      for (const doc of all.docs) {
        await payload.delete({ collection: coll, id: doc.id });
      }
      log(`  wiped ${all.docs.length} from ${coll}`);
    } catch (err) {
      warn(`Could not wipe ${coll}: ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  log('WordPress → Payload importer');
  log(`Mode: ${EXECUTE ? 'EXECUTE (writing)' : 'DRY-RUN (no writes)'}`);
  log(`Stage: ${STAGE || 'all'}`);
  if (LIMIT) log(`Limit: ${LIMIT} per stage`);
  if (CLEAN) log('CLEAN: will wipe non-user collections first');

  // Guard against --clean + scoped --stage combos that would wipe media but
  // not re-import it, leaving inline images unresolvable.
  if (CLEAN && STAGE && STAGE !== 'media') {
    console.error(
      'FATAL: --clean wipes all non-user collections (including media). ' +
      `Running with --stage=${STAGE} would leave inline images orphaned. ` +
      'Either drop --clean, or run without --stage to rebuild everything.'
    );
    process.exit(1);
  }

  const payload = await getPayload({ config });

  const state = {
    mediaMap: new Map(),   // wpMediaId → payloadMediaId
    urlMap: new Map(),     // wpUrl → payloadMediaId (for image rewire)
    pageMap: new Map(),
    serviceMap: new Map(),
    postMap: new Map(),
  };

  if (CLEAN) await cleanCollections(payload);

  const runStage = (name) => !STAGE || STAGE === name;

  // Media must run before services/pages/posts so the urlMap is populated
  if (runStage('media')) await importMedia(payload, state);
  // If skipping media but running others, hydrate state from existing records
  if (!runStage('media') && (runStage('pages') || runStage('posts') || runStage('globals'))) {
    log('\nHydrating media map from existing records...');
    const allMedia = await payload.find({ collection: 'media', limit: 10000, depth: 0 });
    for (const m of allMedia.docs) {
      if (m.wpId) state.mediaMap.set(m.wpId, m.id);
      if (m.wpUrl) state.urlMap.set(m.wpUrl, m.id);
    }
    log(`  loaded ${allMedia.docs.length} existing media records`);
  }

  if (runStage('services') || runStage('pages')) await importPages(payload, state);
  if (runStage('posts')) await importPosts(payload, state);
  if (runStage('globals')) await importGlobals(payload, state);
  if (runStage('redirects')) await importRedirects(payload, state);

  log('\n=== FINAL REPORT ===');
  log(`Media:    ${state.mediaMap.size} mapped`);
  log(`Services: ${state.serviceMap.size} mapped`);
  log(`Pages:    ${state.pageMap.size} mapped`);
  log(`Posts:    ${state.postMap.size} mapped`);

  if (!EXECUTE) {
    log('\n(No writes performed. Re-run with --execute to actually import.)');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
