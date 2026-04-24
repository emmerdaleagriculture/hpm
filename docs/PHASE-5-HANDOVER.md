# Phase 5 handover — Gallery page + sitewide footer update

## What's in this handover

Two pieces of work, both driven off `docs/gallery-page-mockup.html`:

1. **Build the `/gallery` page** as a Next.js route pulling from the Payload Media collection.
2. **Extract the footer into a shared component** and update it across the existing homepage and service page templates — the mockup's footer is the new canonical version and supersedes the footers currently in `docs/homepage-mockup.html` and `docs/service-page-mockup.html`.

Reference mockup: `docs/gallery-page-mockup.html` (copy `gallery-page-template.html` from the handover into `docs/` as `gallery-page-mockup.html`).

---

## 1. Gallery page (`/app/gallery/page.tsx`)

### Behaviour

- Flat masonry grid of all photos in the Media collection
- Click a tile → simple lightbox viewer (big image, prev/next arrows, close, counter)
- Keyboard navigation: arrow keys + Esc
- No filtering, no captions in the grid, no enquiry form in the lightbox — this is a plain gallery of kit and work

### Data source

Payload Media collection — all uploaded images. No service tag filtering needed for this page.

```ts
// app/gallery/page.tsx
import { getPayload } from 'payload'
import config from '@/payload.config'

export default async function GalleryPage() {
  const payload = await getPayload({ config })

  const media = await payload.find({
    collection: 'media',
    limit: 0,           // return all
    sort: '-uploadedAt', // newest first; adjust if you want a different order
    depth: 0,
  })

  return <GalleryClient photos={media.docs} />
}
```

The page is server-rendered; the masonry + lightbox interactivity lives in a `'use client'` component (`GalleryClient`) that takes the photos array as a prop.

### Image rendering

Use `next/image` with the Supabase storage URL. The Media collection stores images in the `hpm-media` bucket (ref: `unakyuksioglmihvipmi`, region `eu-central-1`).

```tsx
<Image
  src={photo.url}
  alt={photo.alt ?? ''}
  width={photo.width}
  height={photo.height}
  sizes="(max-width: 768px) 50vw, (max-width: 1100px) 33vw, 25vw"
  loading="lazy"
/>
```

Using width/height from the Media record preserves aspect ratio, which is what makes the masonry work. With ~170 photos and native lazy-loading, no pagination or virtualisation is needed.

### Masonry

CSS columns, as in the mockup — no JS masonry library. Keep it simple:

```css
.masonry { columns: 4; column-gap: 16px; }
@media (max-width: 1100px) { .masonry { columns: 3; } }
@media (max-width: 768px)  { .masonry { columns: 2; column-gap: 8px; } }
```

Each tile needs `break-inside: avoid` and a `margin-bottom` (not `gap`, because columns don't respect gap vertically).

### Lightbox

Plain React state, no library. From the mockup:

- `open` boolean + `currentIndex` number
- `useEffect` to bind keyboard listeners when open, unbind when closed
- `document.body.style.overflow = 'hidden'` while open
- Click-outside-image closes (check `e.target === lightboxRoot`)
- Prev/next wrap around the array with modulo
- Request a larger image URL for the lightbox view — Payload's sizes config should expose a `large` or `xlarge` variant; use that rather than the thumbnail

### Things the mockup is using placeholder-style

- Hero background image is a stock Unsplash photo. Swap for one of the real imported photos — pick something wide, landscape, and establishing. Could be configurable in Payload (a `gallerySettings` global with a heroImage relation) but hardcoding one for v1 is fine.
- The grid in the mockup renders a hardcoded array of Unsplash URLs for layout demonstration. Real build pulls from Payload.

---

## 2. Shared Footer component

### Why this needs doing now

The footer in the gallery mockup is the new canonical version. It has:

- Three service columns grouped thematically (not a flat list)
- Fifteen services total
- Different grid proportions (`1.4fr 1fr 1fr 1fr 0.8fr 0.8fr`) than the older homepage/service page footers

The older footers in `docs/homepage-mockup.html` and `docs/service-page-mockup.html` are out of date. Don't copy their footers — use the gallery mockup's.

### What to build

Extract to `components/Footer.tsx` as a server component (no interactivity). Drop it into:

- `/app/page.tsx` (homepage)
- `/app/services/[slug]/page.tsx` (service pages)
- `/app/gallery/page.tsx` (new)
- Any other page that currently has a footer or needs one

### Service groupings (hardcoded for now)

```ts
const serviceGroups = [
  {
    heading: 'Cutting & mowing',
    services: [
      { slug: 'paddock-topping', label: 'Paddock topping' },
      { slug: 'flailing', label: 'Flailing' },
      { slug: 'flail-collecting', label: 'Flail collecting' },
      { slug: 'finish-mowing', label: 'Finish mowing' },
    ],
  },
  {
    heading: 'Ground care',
    services: [
      { slug: 'harrowing', label: 'Harrowing' },
      { slug: 'rolling', label: 'Rolling' },
      { slug: 'rotavating', label: 'Rotavating' },
      { slug: 'mole-ploughing', label: 'Mole ploughing' },
      { slug: 'stone-burying', label: 'Stone burying' },
      { slug: 'land-ditch-clearance', label: 'Land & ditch clearance' },
    ],
  },
  {
    heading: 'Treatment & upkeep',
    services: [
      { slug: 'weed-control', label: 'Weed control' },
      { slug: 'spraying', label: 'Spraying' },
      { slug: 'fertiliser-application', label: 'Fertiliser application' },
      { slug: 'overseeding', label: 'Overseeding' },
      { slug: 'manure-sweeping', label: 'Manure sweeping' },
    ],
  },
]
```

Later we can switch this to a Payload query against the Services collection grouped by category, but hardcoding is fine for Phase 5. The category field on the Services collection doesn't exist yet and adding it isn't blocking.

### Service pages that may not exist yet

Some slugs in the footer point to pages the site doesn't have yet (e.g. `land-ditch-clearance`, `flail-collecting`, `finish-mowing`, `rotavating`). The `/services/[slug]/page.tsx` route should handle "not yet published" gracefully — either return a 404 or a "coming soon" placeholder. Don't block the footer on the pages existing.

---

## 3. Gotchas carried forward from Phase 4

Nothing has changed here, but worth restating for anyone picking this up fresh:

- Next.js pinned to exact `15.4.11` for Payload 3.84 compat — don't bump
- `importMap` at `src/app/(payload)/admin/importMap.js`
- Layout needs `serverFunction` prop via `handleServerFunctions`
- Redirects enum values must be strings, not numbers

---

## Acceptance criteria

**Gallery page**
- [ ] `/gallery` renders a masonry grid of all images in the Media collection
- [ ] Images lazy-load and preserve aspect ratio
- [ ] Clicking any image opens a lightbox with the larger image
- [ ] Lightbox supports prev/next (arrows or buttons), Esc-to-close, click-outside-to-close
- [ ] Keyboard arrow keys navigate between images
- [ ] Counter ("3 / 170") displayed at bottom of lightbox
- [ ] Responsive at desktop (4 cols), tablet (3), mobile (2)
- [ ] Hero uses one of the real imported photos

**Shared footer**
- [ ] `components/Footer.tsx` extracted and used on homepage, gallery, and service pages
- [ ] All 15 services listed, grouped into three thematic columns
- [ ] Responsive: 6 cols desktop → 3 cols tablet → 2 cols mobile
- [ ] Existing homepage and service page footers replaced with the new component
