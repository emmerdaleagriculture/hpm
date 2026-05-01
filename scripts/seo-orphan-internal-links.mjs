#!/usr/bin/env node
/**
 * scripts/seo-orphan-internal-links.mjs
 *
 * Carries out the "Internal linking pass for orphan queries" follow-up
 * deferred from PR #25 (see /admin-stats/plan):
 *
 *   "rotavated soil"        — 18-56 imp, pos 4-7, 0 clicks
 *   "poor aeration"         — 18-56 imp, pos 4-7, 0 clicks
 *   "horse paddock drainage" — 18-56 imp, pos 4-7, 0 clicks
 *
 * Position is OK; depth is thin and inbound internal links are scarce.
 * This script appends a contextual paragraph to selected source posts /
 * service pages. Each paragraph contains an inline link with the orphan
 * query as anchor text, pointing at the canonical destination page for
 * that query.
 *
 * The destinations:
 *   "rotavated soil"        → /services/rotavating
 *   "poor aeration"         → /services/harrowing
 *   "horse paddock drainage" → /services/mole-ploughing
 *
 * Strategy: append (don't splice) — we add a new richText block to the
 * end of the page's `content`, with a single paragraph. This avoids
 * touching authored prose mid-document.
 *
 * Idempotent: a page is skipped if any richText block on it already
 * contains a link to the destination URL (regardless of where the
 * link was authored). Conservative — we never want a second
 * cross-link to the same destination on the same page.
 *
 * Modes:
 *   (default)  Discovery — list candidate source pages and their current
 *              tail block; print the proposed paragraph for each. No DB writes.
 *   --execute  Append the paragraph to listed pages.
 *
 * Run with prod DB:
 *   set -a && source .env.local && set +a
 *   DATABASE_URL=$DATABASE_URL_PROD npx tsx scripts/seo-orphan-internal-links.mjs
 *   DATABASE_URL=$DATABASE_URL_PROD npx tsx scripts/seo-orphan-internal-links.mjs --execute
 */
import { getPayload } from 'payload';
import config from '../src/payload/payload.config.ts';

const EXECUTE = process.argv.includes('--execute');

/**
 * Each entry: from a source page (collection + slug), append a paragraph
 * that links to a destination. The phrase is the anchor text the
 * destination page already ranks for at pos 4-7 on GSC.
 *
 * We keep prose short and on-topic — these are real sentences a reader
 * would parse, not link bait. The aim is a *single* high-quality
 * cross-reference per source page.
 */
const INSERTIONS = [
  // === "rotavated soil" → /services/rotavating ===
  {
    from: { collection: 'services', slug: 'overseeding' },
    href: '/services/rotavating',
    anchor: 'rotavated soil',
    sentence:
      'On paddocks where the surface has gone hard or thatched over, drilling into freshly {LINK} gives the new sward a clean, friable bed to root into rather than slot-seeding into compacted ground.',
  },
  {
    from: { collection: 'services', slug: 'spraying' },
    href: '/services/rotavating',
    anchor: 'rotavated soil',
    sentence:
      'On weedy ground that\'s being taken right back to a clean start, the kill needs turning in once it\'s complete — clean {LINK} is what makes a fresh seedbed possible.',
  },

  // === "poor aeration" → /services/harrowing ===
  {
    from: { collection: 'services', slug: 'rolling' },
    href: '/services/harrowing',
    anchor: 'poor aeration',
    sentence:
      'Rolling levels the surface but it can\'t fix {LINK} — if the sward feels spongy or you\'re seeing moss in the spring, harrowing first lets air and light back into the soil.',
  },
  {
    from: { collection: 'services', slug: 'manure-sweeping' },
    href: '/services/harrowing',
    anchor: 'poor aeration',
    sentence:
      'Sweeping clears the surface, but on its own it can\'t fix {LINK} — pair it with harrowing to tear out the dead-grass build-up that\'s quietly suppressing new growth.',
  },

  // === "horse paddock drainage" → /services/mole-ploughing ===
  {
    from: { collection: 'services', slug: 'rotavating' },
    href: '/services/mole-ploughing',
    anchor: 'horse paddock drainage',
    sentence:
      'On heavy clay sites where rotavating alone won\'t fix the underlying wet, mole ploughing for {LINK} cuts sub-surface channels at 18–22 inches without disturbing the surface above.',
  },
  {
    from: { collection: 'services', slug: 'rolling' },
    href: '/services/mole-ploughing',
    anchor: 'horse paddock drainage',
    sentence:
      'If the ground is poaching every winter, rolling will only do so much — addressing {LINK} with mole ploughing tackles the cause rather than the symptom.',
  },
];

/**
 * Build a Lexical richText subtree containing one paragraph with an
 * inline link. Shape matches what Payload's Lexical adapter produces
 * for richText fields (root → paragraph → [text, link → text]).
 */
function buildLexicalParagraph({ sentence, href, anchor }) {
  const [pre, post] = sentence.split('{LINK}');
  if (post === undefined) {
    throw new Error(`sentence is missing {LINK} placeholder: ${sentence}`);
  }
  const children = [];
  if (pre) {
    children.push({
      type: 'text',
      version: 1,
      detail: 0,
      format: 0,
      mode: 'normal',
      style: '',
      text: pre,
    });
  }
  children.push({
    type: 'link',
    version: 3,
    fields: { url: href, linkType: 'custom', newTab: false },
    indent: 0,
    direction: 'ltr',
    format: '',
    children: [
      {
        type: 'text',
        version: 1,
        detail: 0,
        format: 0,
        mode: 'normal',
        style: '',
        text: anchor,
      },
    ],
  });
  if (post) {
    children.push({
      type: 'text',
      version: 1,
      detail: 0,
      format: 0,
      mode: 'normal',
      style: '',
      text: post,
    });
  }
  return {
    root: {
      type: 'root',
      version: 1,
      indent: 0,
      direction: 'ltr',
      format: '',
      children: [
        {
          type: 'paragraph',
          version: 1,
          indent: 0,
          direction: 'ltr',
          format: '',
          textFormat: 0,
          children,
        },
      ],
    },
  };
}

/** Walk Lexical state looking for the marker URL. */
function alreadyHasLink(node, href) {
  if (!node || typeof node !== 'object') return false;
  if (node.type === 'link' && node.fields?.url === href) return true;
  if (Array.isArray(node.children)) {
    for (const c of node.children) if (alreadyHasLink(c, href)) return true;
  }
  if (node.root) return alreadyHasLink(node.root, href);
  return false;
}

const payload = await getPayload({ config });

console.log(EXECUTE ? '[execute] writing orphan-link insertions' : '[dry-run] use --execute to write');
console.log();

let appended = 0;
let unchanged = 0;
let missing = 0;

for (const ins of INSERTIONS) {
  const found = await payload.find({
    collection: ins.from.collection,
    where: { slug: { equals: ins.from.slug } },
    limit: 1,
    depth: 0,
  });
  const doc = found.docs[0];
  const label = `${ins.from.collection}/${ins.from.slug} → ${ins.href} ("${ins.anchor}")`;

  if (!doc) {
    console.log(`  [missing] ${label}`);
    missing++;
    continue;
  }

  const content = Array.isArray(doc.content) ? doc.content : [];
  const existingLink = content.some(
    (block) => block?.blockType === 'richText' && alreadyHasLink(block.content, ins.href),
  );
  if (existingLink) {
    console.log(`  [unchanged] ${label} (link already present)`);
    unchanged++;
    continue;
  }

  const newBlock = {
    blockType: 'richText',
    content: buildLexicalParagraph({
      sentence: ins.sentence,
      href: ins.href,
      anchor: ins.anchor,
    }),
  };

  console.log(`  [append] ${label}`);
  console.log(`    sentence: ${ins.sentence.replace('{LINK}', `[${ins.anchor}]`)}`);

  if (!EXECUTE) continue;

  try {
    await payload.update({
      collection: ins.from.collection,
      id: doc.id,
      data: { content: [...content, newBlock] },
    });
    appended++;
  } catch (err) {
    console.error(`    error: ${err instanceof Error ? err.message : err}`);
  }
}

console.log(`\nDone — ${EXECUTE ? `${appended} appended, ` : ''}${unchanged} unchanged, ${missing} missing`);
process.exit(0);
