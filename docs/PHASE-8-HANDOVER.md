# Phase 8 handover — Notes (blog) index + post template

## What's in this handover

Build the blog as `/notes` with two routes:

1. **`/notes`** — index of all 48 imported posts, with featured post + tag filter + masonry grid + load more
2. **`/notes/[slug]`** — single post template with reading-first typography, automatic service CTA panel, and related posts

Reference mockups (drop into `docs/`):

- `docs/notes-index-mockup.html`
- `docs/notes-post-mockup.html`

---

## 1. Why /notes (not /blog)

Voice consistency with the rest of the site — "Notes from the field" reads warmer than "Blog". The nav and footer references it as "Notes".

**Old WordPress URLs** likely use `/blog/...`. Two options:

- **Add `/blog/[slug]` as a permanent redirect to `/notes/[slug]`** (preferred — preserves SEO juice, fixes any external links)
- **Keep `/blog` as the canonical path** if Tom prefers it. Easy swap — just rename the route folder and update nav/footer links

Default to the redirect approach. If old WP audit data shows different patterns (e.g. `/post/[slug]` or `/[slug]`), add those redirects too.

---

## 2. Posts collection — what's already there

Phase 4 imported 48 posts into the Payload Posts collection. **Tom hasn't yet confirmed** whether tags/categories came across with them. First task: open the Payload admin, inspect a few posts, and report back. Three possible states:

- **Tags came across cleanly** → use them as-is
- **Tags came across messily** (inconsistent slugs, duplicates) → small cleanup pass, then use them
- **No tags** → need to add a tags field and Tom will tag posts manually before launch

Either way, the build should not block on tagging. Render with whatever's there; ungrouped posts just don't appear in tag-filtered views.

### Required Posts schema fields

If not already present, add to the Posts collection:

```ts
{
  title: string                  // required
  slug: string                   // required, auto from title
  excerpt: string                // short summary for cards (~140 chars)
  heroImage: relationship → media   // post hero + card thumbnail
  tags: array of relationship → tags collection   // multiple tags allowed
  primaryTag: relationship → tags collection      // single tag, drives the service CTA
  body: richText                 // post content
  publishedAt: date              // shown as "March 2026" on cards/hero
  featured: boolean              // exactly one post should be marked featured at any time
  readTime: number               // optional; can be derived from body word count if absent
}
```

A separate `tags` collection with `slug` and `label` fields keeps things tidy.

### Suggested tag taxonomy (~6-8 tags)

Hardcode this list when seeding the tags collection, then let Tom assign them per post:

```
topping, weeds, seasonal, equipment, ground-care, advice, drainage, kit
```

Don't let tags sprawl — too many tag chips on the index becomes noise.

---

## 3. Index page — `/app/notes/page.tsx`

### Sections (in order, all in mockup)

1. **Compact hero** — same family as gallery and contact heroes
2. **Featured post block** — large, two-column on desktop. The post with `featured: true`. If multiple are flagged, pick the most recent.
3. **Sticky tag filter** — chips below the featured. Same pattern as the gallery had originally; same component if extracted.
4. **Posts grid (masonry)** — three columns on desktop, two on tablet, one on mobile. CSS columns, not JS masonry library. Each card: photo, primary tag pill, date, title, excerpt.
5. **Load more button** — paginates 12 at a time
6. **CTA band** — green-deep, "Reading is fine. Doing is better." → contact
7. **Footer** — shared component

### Data fetching

```ts
// app/notes/page.tsx
import { getPayload } from 'payload'
import config from '@/payload.config'

export default async function NotesIndex() {
  const payload = await getPayload({ config })

  const [featured, posts, tags] = await Promise.all([
    payload.find({
      collection: 'posts',
      where: { featured: { equals: true } },
      limit: 1,
      sort: '-publishedAt',
      depth: 1,
    }),
    payload.find({
      collection: 'posts',
      where: { featured: { not_equals: true } },
      limit: 0,
      sort: '-publishedAt',
      depth: 1,
    }),
    payload.find({
      collection: 'tags',
      limit: 0,
      sort: 'label',
    }),
  ])

  return <NotesIndexClient
    featured={featured.docs[0]}
    posts={posts.docs}
    tags={tags.docs}
  />
}
```

The page is server-rendered. Filtering, masonry rendering, and "load more" interactivity live in a `'use client'` child component.

### Filter behaviour

- Filter is **client-side** (no URL navigation per chip). All posts are sent to the client; the chips just toggle visibility.
- Tag chips read from URL on first load — `/notes?tag=topping` should pre-select topping. This makes the breadcrumb on post pages (`Notes · Topping`) link back correctly.
- Active tag updates the URL via `history.replaceState` so it's shareable but doesn't trigger a re-fetch.

### Featured post selection

For v1, "featured" is a manual boolean on the Posts collection. Tom flags one post as featured; that's what shows. If zero are featured, fall back to the most recent post. If multiple, take the most recent of the flagged ones.

---

## 4. Post template — `/app/notes/[slug]/page.tsx`

### Sections (in order, all in mockup)

1. **Post hero** — taller than other heroes (~56vh). Background photo with bottom-weighted gradient, breadcrumb, title, primary tag pill, date, read time
2. **Article body** — single column, max-width 720px. First paragraph dropped to larger size as a reading anchor. Tenor Sans h2/h3, DM Sans body, italic Georgia pull-quotes.
3. **Service CTA panel** — automatic, tied to primary tag (see section 5)
4. **Sign-off** — byline with author photo + name + one-line bio
5. **Related posts** — three cards, tag-overlap ranked with recency fallback (see section 6)
6. **Footer** — shared component

### Rich text rendering

The Posts collection's `body` field is Payload's rich text. Render with the standard Payload rich text serializer, mapping:

- `h2` → styled `<h2>` per mockup
- `h3` → styled `<h3>` per mockup
- `blockquote` → styled `.pullquote` per mockup
- Image upload nodes → `<figure>` with full-width-bleed styling (`.article-image` in mockup)
- Links → underlined yellow per mockup
- Lists → as in mockup

Imported WordPress content may have HTML embedded (the WP→Payload import doesn't always produce clean richText). Worth a sanity check on a few imported posts before launch — if some posts have embedded `<div>` or inline styles, the renderer may need a fallback that handles raw HTML.

### Read time

If not stored on the post, compute from body word count: `Math.max(1, Math.round(wordCount / 220))`. Display as "6 min read".

### Author byline

For v1, hardcoded as Tom. If the business ever takes on staff who post, lift to an Authors collection. Not now.

---

## 5. Service CTA panel — automatic linking

This is the SEO-meets-conversion piece. Each post's primary tag drives a CTA panel pointing to a related service.

### Mapping

Lives as a plain TS constant (not Payload — too few entries to justify the overhead, and editorial control is fine in code):

```ts
// lib/tag-service-map.ts
export const tagToService: Record<string, { slug: string; label: string }> = {
  topping: { slug: 'paddock-topping', label: 'Paddock topping' },
  weeds: { slug: 'weed-control', label: 'Weed control' },
  'ground-care': { slug: 'harrowing', label: 'Harrowing' }, // generic fallback for ground-care tag
  drainage: { slug: 'mole-ploughing', label: 'Mole ploughing' },
  kit: null,        // no service CTA — informational tag
  equipment: null,  // no service CTA — informational tag
  seasonal: null,   // no service CTA — informational tag
  advice: null,     // no service CTA — informational tag
}
```

### Rendering rule

If `tagToService[post.primaryTag.slug]` is defined, render the green-deep CTA panel with the matched service. If undefined or null, omit the panel entirely. **Don't render an empty or generic CTA** — the magic of this pattern is that it's specific.

### Panel copy

Looks like this in the mockup:

> **Want this done for you?**
> I top paddocks across Hampshire and *surrounding counties*
> Most jobs quoted over the phone. No site visit fee.
> [See paddock topping →]

The verb in the headline ("top paddocks") is conjugated to the service. Hardcoded variants per service work fine — it's 15 services, not 1500. Lift the mapping to include a templated headline:

```ts
{ slug: 'paddock-topping', label: 'Paddock topping', verb: 'top paddocks' }
```

Then build the headline as: `I ${verb} across Hampshire and surrounding counties`.

---

## 6. Related posts — automatic, with fallback

At the bottom of every post, three related cards.

### Algorithm

1. Find all posts (excluding the current one) sharing at least one tag with the current post
2. Rank by tag overlap count (most tags in common = most related)
3. Tiebreak by recency
4. If fewer than 3 results, fill remaining slots with most-recent posts that aren't already in the list
5. If the post has no tags, just show three most-recent posts

This handles the "untagged posts" risk — the section never looks broken, even if the data is incomplete.

### Implementation

Server-side in `getPayload`:

```ts
async function getRelated(post, payload) {
  const tagIds = post.tags?.map(t => t.id) ?? []

  if (tagIds.length === 0) {
    const recent = await payload.find({
      collection: 'posts',
      where: { id: { not_equals: post.id } },
      sort: '-publishedAt',
      limit: 3,
    })
    return recent.docs
  }

  // Get all tagged-overlap candidates
  const candidates = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { id: { not_equals: post.id } },
        { tags: { in: tagIds } },
      ],
    },
    limit: 20,
    depth: 1,
  })

  // Rank by overlap count, then recency
  const ranked = candidates.docs
    .map(c => ({
      post: c,
      overlap: c.tags?.filter(t => tagIds.includes(t.id)).length ?? 0,
    }))
    .sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap
      return new Date(b.post.publishedAt).getTime() - new Date(a.post.publishedAt).getTime()
    })
    .slice(0, 3)
    .map(r => r.post)

  // Fill if short
  if (ranked.length < 3) {
    const fillCount = 3 - ranked.length
    const existingIds = ranked.map(r => r.id)
    const fillers = await payload.find({
      collection: 'posts',
      where: {
        and: [
          { id: { not_equals: post.id } },
          { id: { not_in: existingIds } },
        ],
      },
      sort: '-publishedAt',
      limit: fillCount,
    })
    ranked.push(...fillers.docs)
  }

  return ranked
}
```

---

## 7. Static generation

Posts should pre-render at build time:

```ts
// app/notes/[slug]/page.tsx
export async function generateStaticParams() {
  const payload = await getPayload({ config })
  const posts = await payload.find({
    collection: 'posts',
    limit: 0,
    select: { slug: true },
  })
  return posts.docs.map(p => ({ slug: p.slug }))
}

export const revalidate = 3600 // ISR: regenerate at most once per hour
```

Pre-rendering 48 posts is fast and gives the SEO half its best chance.

---

## 8. SEO meta per post

Each post needs:

- `<title>` — `${post.title} — Notes from the field — Hampshire Paddock Management`
- `<meta name="description">` — `post.excerpt`
- OG tags — title, description, hero image
- Canonical URL — `https://hampshirepaddockmanagement.co.uk/notes/${post.slug}`
- Article structured data (JSON-LD) — `Article` schema with author, datePublished, image, headline

Use Next.js `generateMetadata`:

```ts
export async function generateMetadata({ params }) {
  const post = await getPostBySlug(params.slug)
  return {
    title: `${post.title} — Notes from the field — Hampshire Paddock Management`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.heroImage.url }],
      type: 'article',
      publishedTime: post.publishedAt,
    },
    alternates: {
      canonical: `/notes/${post.slug}`,
    },
  }
}
```

Index page also needs its own metadata — title, description, OG image (use a curated photo).

---

## 9. Acceptance criteria

**Index (`/notes`)**
- [ ] Featured post displayed at top
- [ ] Tag filter chips work, default to "All notes", filter is client-side
- [ ] `?tag=topping` pre-selects the topping chip on first load
- [ ] Masonry grid: 3 columns desktop, 2 tablet, 1 mobile
- [ ] Load more reveals 12 more posts at a time
- [ ] Empty state shown when filter has no results
- [ ] CTA band before footer

**Post (`/notes/[slug]`)**
- [ ] All 48 imported posts have working URLs
- [ ] Hero with breadcrumb linking to filtered index (`/notes?tag=topping`)
- [ ] First paragraph dropped to larger size
- [ ] Pull-quotes from blockquotes render styled
- [ ] Inline images render full-bleed
- [ ] Service CTA panel renders only when primary tag has a service mapping
- [ ] Service CTA verb-conjugated correctly per service
- [ ] Sign-off byline with author photo, name, one-line bio
- [ ] Three related posts, ranked by tag overlap with recency fallback
- [ ] Each post has `generateMetadata` with title, description, OG tags, canonical
- [ ] All posts pre-rendered via `generateStaticParams`

**Redirects**
- [ ] `/blog/[slug]` → `/notes/[slug]` (301 permanent redirect)
- [ ] Any other old WP URL patterns from Phase 1b audit also redirected

**Data prep tasks for Tom (not blocking the build)**
- [ ] Confirm tag/category state of imported posts
- [ ] Tag any untagged posts manually
- [ ] Mark one post as featured
- [ ] Audit for any imported posts with broken HTML or stale references that should be unpublished

---

## 10. Gotchas carried forward

- Next.js pinned to exact `15.4.11` for Payload 3.84 compat — don't bump
- `importMap` at `src/app/(payload)/admin/importMap.js`
- Layout needs `serverFunction` prop via `handleServerFunctions`
- Redirects enum values must be strings, not numbers
