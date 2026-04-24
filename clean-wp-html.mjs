/**
 * clean-wp-html.mjs
 *
 * Aggressive cleaner for WordPress/Elementor HTML.
 * Strips everything except semantic content: h1-h6, p, ul/ol/li, strong/em,
 * a, img, blockquote, figure/figcaption.
 *
 * Input:  raw WP content.rendered string
 * Output: { html: clean HTML, images: [{src, alt, caption?}], textLength: n }
 */

import * as cheerio from 'cheerio';

// Tags we keep (with their children recursively processed)
const KEEP_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i', 'u',
  'a', 'img',
  'blockquote', 'figure', 'figcaption',
  'br', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', // rarely useful but legit
]);

// Tags whose content we UNWRAP (remove the tag, keep children)
const UNWRAP_TAGS = new Set([
  'div', 'section', 'span', 'article', 'aside', 'header', 'footer',
  'main', 'nav', 'form',
]);

// Tags we drop ENTIRELY including contents
const DROP_TAGS = new Set([
  'script', 'style', 'noscript', 'iframe', 'embed', 'object',
  'button', 'input', 'select', 'textarea', 'label',
  'svg', 'canvas', 'video', 'audio', // we'll handle video separately
]);

// Attributes we preserve (per tag, if appropriate)
const KEEP_ATTRS = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  // everything else: no attributes
};

export function cleanWPContent(html, opts = {}) {
  const $ = cheerio.load(`<div id="__root">${html}</div>`, { decodeEntities: false });
  const root = $('#__root');

  // Pass 1: drop entire subtrees
  root.find('*').each((_, el) => {
    if (DROP_TAGS.has(el.tagName)) {
      $(el).remove();
    }
  });

  // Pass 2: unwrap cosmetic wrappers — repeat until nothing changes
  let changed = true;
  let passes = 0;
  while (changed && passes < 20) {
    changed = false;
    passes++;
    root.find('*').each((_, el) => {
      if (UNWRAP_TAGS.has(el.tagName)) {
        // Check if this div contains a caption — preserve it as a figcaption sibling of the image
        const $el = $(el);
        const className = $el.attr('class') || '';
        if (className.includes('cz_image_caption') || className.includes('wp-caption-text')) {
          // Convert to figcaption
          const text = $el.text().trim();
          if (text) {
            $el.replaceWith(`<figcaption>${text}</figcaption>`);
          } else {
            $el.remove();
          }
          changed = true;
          return;
        }
        // Standard unwrap
        $el.replaceWith($el.contents());
        changed = true;
      }
    });
  }

  // Pass 3: strip all attributes except the whitelisted ones
  root.find('*').each((_, el) => {
    const tag = el.tagName;
    const keep = KEEP_ATTRS[tag] || [];
    const attribs = { ...el.attribs };
    for (const attr of Object.keys(attribs)) {
      if (!keep.includes(attr)) {
        $(el).removeAttr(attr);
      }
    }
  });

  // Pass 4: collect images (for the caller to rewire to new Media IDs)
  const images = [];
  root.find('img').each((_, el) => {
    const $el = $(el);
    images.push({
      src: $el.attr('src') || '',
      alt: $el.attr('alt') || '',
    });
  });

  // Pass 5: collapse empty paragraphs and multiple <br>s
  // Remove empty <p></p>
  root.find('p').each((_, el) => {
    const $el = $(el);
    if ($el.text().trim() === '' && $el.find('img').length === 0) {
      $el.remove();
    }
  });
  // Collapse adjacent <br><br> — not critical, but tidier
  root.find('br + br').remove();

  // Pass 6: unwrap any KEEP tags that wrap only whitespace/empty
  root.find('strong, em, b, i, u').each((_, el) => {
    const $el = $(el);
    if ($el.text().trim() === '' && $el.find('img').length === 0) {
      $el.remove();
    }
  });

  // Pass 7: dedupe adjacent identical images (Elementor main+hover pattern)
  const seenImgSrcs = [];
  root.find('img').each((_, el) => {
    const src = $(el).attr('src');
    const prev = seenImgSrcs[seenImgSrcs.length - 1];
    if (prev === src) {
      $(el).remove();
    } else {
      seenImgSrcs.push(src);
    }
  });
  // Also dedupe in the images array
  const seenInArray = new Set();
  const dedupedImages = [];
  for (const img of images) {
    const key = img.src + '|' + img.alt;
    if (!seenInArray.has(key)) {
      seenInArray.add(key);
      dedupedImages.push(img);
    }
  }

  // Pass 8: strip Elementor title-line decorations — stray "_" or "—" text
  // nodes that aren't inside an element. They appear as direct text children
  // of root or inside bare text patterns.
  // Look for paragraphs / text containing only "_" or similar decorative chars
  root.find('p, span').each((_, el) => {
    const text = $(el).text().trim();
    if (text === '_' || text === '—' || text === '–') {
      $(el).remove();
    }
  });

  // Pass 9: handle "eyebrow + heading" pattern. WP/Elementor templates often
  // emit <p>Hampshire Paddock Management.</p><h3>More About Us</h3> where the
  // <p> is decorative eyebrow text. If a <p> immediately precedes a heading
  // and is short (< 60 chars), drop it.
  root.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const prev = $(el).prev();
    if (prev.length && prev[0].tagName === 'p') {
      const text = prev.text().trim();
      if (text.length > 0 && text.length < 60 && !text.endsWith(':')) {
        prev.remove();
      }
    }
  });

  // Serialize
  let cleanHtml = root.html() || '';

  // Post-process: collapse whitespace. Preserve single newlines between blocks
  // but kill runs of tabs/newlines inside.
  cleanHtml = cleanHtml
    .replace(/[\t]+/g, '')                       // strip tabs
    .replace(/\n\s*\n\s*\n+/g, '\n\n')            // collapse 3+ newlines to 2
    .replace(/>\s+</g, '><')                      // no space between adjacent tags
    .replace(/<(p|h[1-6]|li|figcaption)>\s+/g, '<$1>') // no leading ws in blocks
    .replace(/\s+<\/(p|h[1-6]|li|figcaption)>/g, '</$1>') // no trailing ws
    .trim();

  // Stray "_" as orphan text between tags
  cleanHtml = cleanHtml.replace(/>[\s]*_[\s]*</g, '><');

  // Replace images array with deduped version
  images.length = 0;
  images.push(...dedupedImages);

  // Measure actual text content
  const textLength = root.text().trim().length;

  return {
    html: cleanHtml.trim(),
    images,
    textLength,
  };
}

// If run directly, clean the uploaded about.json and print results
if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('fs');
  const path = process.argv[2] || './about.json';
  const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
  const rawContent = data.content.rendered;
  const result = cleanWPContent(rawContent);

  console.log('=== STATS ===');
  console.log('Raw length:      ', rawContent.length);
  console.log('Cleaned length:  ', result.html.length);
  console.log('Reduction:       ', Math.round((1 - result.html.length / rawContent.length) * 100) + '%');
  console.log('Text length:     ', result.textLength);
  console.log('Images found:    ', result.images.length);
  console.log('');
  console.log('=== IMAGES ===');
  result.images.forEach((img, i) => {
    console.log(`[${i + 1}] ${img.src}`);
    console.log(`    alt: "${img.alt}"`);
  });
  console.log('');
  console.log('=== CLEANED HTML ===');
  console.log(result.html);
}
