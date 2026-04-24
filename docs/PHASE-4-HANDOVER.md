# Phase 4 handover — WordPress → Payload content import

This document is a handover from design-phase chat to execution-phase Claude Code.
It contains everything you need to take the import from "drafted" to "done".

---

## What's already built

1. **Next.js 15 + Payload 3 scaffold** — running locally at `localhost:3000`,
   admin dashboard works at `/admin`, admin user created.
2. **Supabase wired** — project ref `unakyuksioglmihvipmi` (eu-central-1, Frankfurt),
   storage bucket `hpm-media` (public).
3. **WordPress content extracted** — `extracted/` contains:
   - `manifest.json` — summary of everything
   - `pages/{slug}.json` — 30 pages (raw WP REST shape)
   - `posts/{slug}.json` — 48 posts
   - `raw/{media,pages,posts,categories,tags}.json` — raw REST dumps
   - `media/wp-content/uploads/...` — 169 downloaded image files
4. **HTML cleaner** designed and tested. Aggressive strip of Elementor sludge,
   ~80% size reduction, preserves semantic structure + images, dedupes
   Elementor `cz_main_image` + `cz_hover_image` duplicates, strips Elementor
   title-line decorations. Tested against `extracted/pages/about.json`:
   34,785 chars → 5,588 chars, 2 unique images from 4 duplicates.
5. **Importer script** drafted at `scripts/import-from-wp.mjs` (860 lines).
   Inlines the HTML cleaner. Has dry-run (default), `--execute`, `--stage`,
   `--limit`, `--verbose`, `--clean` flags. Uses Payload Local API.

---

## Known mismatches to reconcile

The importer was drafted before verifying the Phase 3 schema. These need fixing:

### 1. Config import path

Importer has:

```js
import config from '../src/payload.config.ts';
```

Actual path is `../src/payload/payload.config.ts`. Fix this first — everything
else depends on it booting Payload correctly.

### 2. Wrong field name on posts

Importer writes `featuredImage` on posts. Schema has `heroImage`. Rename in
the importer (`importPosts()` function).

### 3. `status` field doesn't exist

Importer writes `status: data.status === 'publish' ? 'published' : 'draft'` on
pages/services/posts. These collections don't have a `status` field — Payload 3
handles drafts via the versioning/`_status` system, which is a separate opt-in.

**Decision: remove the status field from the importer entirely.** Everything
imports as published. If Tom wants drafts-on-import later, that's a separate
Phase 4.5 task that involves enabling `versions: { drafts: true }` on the
collections and setting `_status: 'draft'`.

### 4. Tracking fields missing from schema

Importer assumes these fields exist for idempotent re-runs and image rewiring:

- `media` collection: `wpId` (number, indexed), `wpUrl` (text, indexed)
- `pages` collection: `wpId` (number, indexed)
- `services` collection: `wpId` (number, indexed)
- `posts` collection: `wpId` (number, indexed)

These must be added to the schema before the importer will work.

---

## Tasks (in order)

### Task 1: Add tracking fields to the schema

For each of `src/payload/collections/{media,pages,services,posts}.ts`, add a
`wpId` field to the `fields` array:

```ts
{
  name: 'wpId',
  type: 'number',
  index: true,
  admin: {
    position: 'sidebar',
    readOnly: true,
    description: 'WordPress post/page ID — for migration tracking. Do not edit.',
  },
},
```

For `media.ts` only, **also** add `wpUrl`:

```ts
{
  name: 'wpUrl',
  type: 'text',
  index: true,
  admin: {
    position: 'sidebar',
    readOnly: true,
    description: 'Original WordPress URL at time of import. Do not edit.',
  },
},
```

Put both fields near the end of the `fields` array, after the existing content
fields (keeps admin UI tidy).

### Task 2: Apply the migration

```bash
cd ~/hpm-site
npm run payload:migrate
```

If migrations are configured, this generates a new migration file and applies
it. If Payload is running in dev mode with `push: true` (default in dev), a
simple dev server restart may apply the change automatically. Either way,
verify by loading `/admin` and confirming the new fields appear in the sidebar
for Media (wpId + wpUrl) and Pages/Services/Posts (wpId only).

### Task 3: Fix the importer

In `scripts/import-from-wp.mjs`:

1. **Config path**: change `import config from '../src/payload.config.ts';` to
   `import config from '../src/payload/payload.config.ts';`

2. **Post field rename**: In `importPosts()`, change:
   ```js
   if (featuredMediaId && featuredMediaId !== undefined) {
     payloadData.featuredImage = featuredMediaId;
   }
   ```
   to:
   ```js
   if (featuredMediaId && featuredMediaId !== undefined) {
     payloadData.heroImage = featuredMediaId;
   }
   ```

3. **Remove `status` field**: In `importPages()` and `importPosts()`, remove
   the `status:` line from the `payloadData` object.

### Task 4: Dry-run with limit

```bash
cd ~/hpm-site
node scripts/import-from-wp.mjs --stage=media --limit=3 --verbose
```

Expected: boots Payload, prints "would create: {filename}" for 3 media items,
exits cleanly. **No writes to Supabase, no writes to Payload.**

If this errors, debug before proceeding. Most likely failure modes:

- **`Cannot find module '../src/payload/payload.config.ts'`** — path still wrong
- **`Cannot use import statement outside a module`** — script needs Node ESM
  mode. Check `package.json` has `"type": "module"` or rename to `.mjs` (it
  already is `.mjs`, so should be fine)
- **TypeScript import error** — Node doesn't natively run `.ts` files. May
  need to run via `tsx scripts/import-from-wp.mjs` or similar. Check how
  other scripts in the repo are invoked (look at `package.json`'s `extract`
  script as a reference).
- **Payload boot error** — the Local API needs PAYLOAD_SECRET and DATABASE_URL.
  Make sure `.env.local` is loaded (may need `dotenv/config` preamble or
  running via `tsx --env-file=.env.local`).

### Task 5: Real upload test — 3 media

```bash
node scripts/import-from-wp.mjs --execute --stage=media --limit=3 --verbose
```

Expected:
- Payload creates 3 Media records
- Supabase Storage receives 3 files in `hpm-media` bucket
- Images visible in Payload admin at `/admin/collections/media`

### Task 6: Verify Supabase Storage

Check the Supabase dashboard → Storage → `hpm-media` bucket. The 3 uploaded
files should be there. Also check the Payload admin media library — thumbnails
should render (proves the Supabase Storage public URL is correctly wired).

If files are in Supabase but thumbnails don't render in admin → the storage
adapter config has the wrong public URL base. Check
`src/payload/payload.config.ts` for the `@payloadcms/storage-s3` configuration.

### Task 7: Report back

Report to Tom:
- Did the dry-run succeed? Any warnings?
- Did the 3-media real import succeed?
- Are the files visible in Supabase Storage?
- Are thumbnails rendering in Payload admin?
- Any errors, and exactly what they were?

**Stop here.** Do not proceed to the full import until Tom confirms. This
checkpoint exists because the first 3 uploads are the highest-risk step — they
prove the whole Payload → Supabase Storage pipeline works. Once that's green,
the full 169-file upload is boring, and the page/post imports follow the same
pattern.

---

## Full run sequence (after Tom approves)

Once tasks 1–7 are green, the rest is straightforward:

```bash
# Full media import (169 files, takes several minutes)
node scripts/import-from-wp.mjs --execute --stage=media

# Services + pages (routed by slug, see SERVICE_SLUGS in the script)
node scripts/import-from-wp.mjs --execute --stage=pages

# Posts (48 of them — Videscape/Clickasnap accountability posts included,
# Tom confirmed keeping them)
node scripts/import-from-wp.mjs --execute --stage=posts

# Globals — homepage + site-settings
node scripts/import-from-wp.mjs --execute --stage=globals

# Redirects — only the WooCommerce stubs for now
node scripts/import-from-wp.mjs --execute --stage=redirects
```

---

## HTML cleaner reference

The cleaner is inlined in `import-from-wp.mjs` (function `cleanWPContent`).
It's also available standalone at the project root as `clean-wp-html.mjs` for
debugging. Run against any page to see cleaned output:

```bash
node clean-wp-html.mjs extracted/pages/paddock-topping.json
```

### What it does

- Drops entirely: `script, style, noscript, iframe, embed, object, button,
  input, select, textarea, label, svg, canvas, video, audio`
- Unwraps (keeps children): `div, section, span, article, aside, header,
  footer, main, nav, form`
- Keeps: `h1-h6, p, ul, ol, li, strong, em, b, i, u, a, img, blockquote,
  figure, figcaption, br, hr, table, thead, tbody, tr, th, td`
- Strips all attributes except `a[href|title]` and `img[src|alt|title|width|height]`
- Converts Elementor caption divs (`.cz_image_caption`, `.wp-caption-text`)
  to `<figcaption>`
- Dedupes adjacent duplicate `<img>` tags (Elementor main+hover pattern)
- Strips `_`, `—`, `–` decorative paragraphs (Elementor title-line)
- Drops short `<p>` (<80 chars, no trailing colon) immediately before a
  heading (Elementor eyebrow-text pattern)
- Decodes HTML entities, collapses whitespace

### What it doesn't do

- Preserve layout (columns, spacers, specific Elementor widgets) — intentional
- Handle `<table>` conversion to Lexical — falls back to plain text
- Handle embeds (YouTube, Vimeo) — they get dropped with `iframe`. If Tom has
  embedded videos in content, he'll need to re-add them via the videos
  collection.

---

## Lexical conversion reference

Minimal HTML → Lexical converter at function `htmlToLexical` in the importer.
Handles:

- `h1-h6` → heading node (preserves level)
- `p` → paragraph node
- `ul` / `ol` → list node (type 'bullet' / 'number')
- `li` → listitem node
- `strong/b` → bold (format flag 1)
- `em/i` → italic (format flag 2)
- `u` → underline (format flag 8)
- `a` → link node (custom type, preserves href)
- `img` (with mediaMap hit) → upload node pointing at Media record
- `img` (no mediaMap hit) → fallback paragraph "[unresolved image: ...]"
  and logs a warning
- `br` → linebreak
- `blockquote` → quote node
- `figcaption` → italicised paragraph (Lexical doesn't have a native
  figcaption; this is the cleanest fallback)
- `hr` → horizontalrule

**Known limits:** nested lists, tables, and any non-listed tag fall back to
plain text extraction. Good enough for the current corpus.

---

## Idempotency model

- **Media**: looked up by `wpId` before create. Re-running is safe.
- **Pages / Services**: looked up by `slug`. Re-running is safe.
- **Posts**: looked up by `slug`. Re-running is safe.
- **Globals**: always updated (globals are singletons, no dedup needed).
- **Redirects**: looked up by `from`. Re-running is safe.

State shared across stages (`wpMediaId → payloadMediaId`, `wpUrl →
payloadMediaId`, etc.) is rebuilt on each run by querying existing records,
so running stages individually (e.g. `--stage=posts` without re-running
`--stage=media`) works correctly — the importer hydrates `state.urlMap` from
existing Media records first.

---

## Context Tom and I discussed

- **Cleaner aggressiveness**: aggressive strip chosen. Rationale: preserving
  Elementor columns/callouts would require bespoke converters for every
  widget type, and those layouts were for the *old* design, not Hampshire
  Green. Better to get clean semantic content and re-layout deliberately on
  the new site.
- **Videscape/Clickasnap accountability posts**: Tom confirmed importing.
  "Public on the live site, keep the paper trail."
- **Service vs page classification**: hardcoded list of 11 slugs in the
  importer. See `SERVICE_SLUGS` at top of file.
- **Media upload path**: through Payload (not direct to Supabase). Preserves
  alt text, focal points, generates resized variants. Slower but correct.
- **SEO data**: AIO SEO plugin data wasn't in the extract. Importer generates
  meta descriptions from excerpts. Tom will polish in admin post-import.
- **Service-specific fields** (price, equipment, duration): importer leaves
  them blank. Tom fills them in from his head, not from the WP site.

---

## Things NOT in scope for Phase 4

These are deliberately deferred:

- Frontend build (Hampshire Green design, templates, SEO/sitemap) — Phase 4A,
  after content import is complete
- Full redirect map from the Phase 1b audit — only WooCommerce stubs included
  for now
- Galleries, tools, videos collections population — these were Phase 2 schema
  designs but there's no extracted content for them yet
- Contact form wiring to Resend — Phase 4A
- DNS cutover — Phase 5

---

## If things go wrong

Common issues and likely fixes:

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module 'payload'` | script run outside project dir | `cd ~/hpm-site` first |
| `PAYLOAD_SECRET is required` | .env not loaded | Prepend `dotenv/config` import or use `--env-file=.env.local` |
| `.ts extension unsupported` | Node can't natively import TypeScript config | Run via `tsx` or `ts-node`, or pre-compile config |
| Upload succeeds but admin thumbnail broken | Supabase Storage public URL misconfigured | Check `@payloadcms/storage-s3` adapter config for correct public URL base |
| `duplicate key` on re-run | Idempotency check failing — wpId/slug lookup isn't matching | Verify the `wpId` field was added to the schema and Payload knows about it; check with a simple `find()` call |
| HTML comes through as empty | HTML cleaner returned empty string | Check the raw `content.rendered` in the JSON — may be a non-standard Elementor pattern. Run `clean-wp-html.mjs` against that specific file to debug. |

If you hit something genuinely stuck, Tom will come back to chat and we'll
debug from there.
