# Phase 6 handover — About page

## What's in this handover

Build `/about` as a Next.js route. Mostly-static content page using the existing shared chrome (nav + footer components from earlier phases).

Reference mockup: drop `about-page-template.html` into `docs/` as `about-page-mockup.html` before starting.

---

## Build target: `/app/about/page.tsx`

### What kind of page this is

Mostly static content. No CMS query needed for v1 — copy lives in the page component (or a co-located constants file). Can be moved to a Payload global later if Tom wants editable copy without a deploy, but that's out of scope here.

### Sections (in order, all in the mockup)

1. **Hero** — same family as gallery and homepage heroes. Headline: "Specialist paddock work, run properly". Subhead about being the person on the tractor.
2. **Intro block** — two-column on desktop (portrait photo left, opening text right), stacks on mobile. Photo of Tom needed — currently a placeholder.
3. **Story body** — single column, max-width 720px. Includes a yellow-bordered pull-quote.
4. **Credentials strip** — cream background, four cards: PA1, PA2, HGV/Cat B, public liability. Two-column on tablet and mobile.
5. **Service area** — short centred block. Hampshire and surrounding counties.
6. **Photo break** — full-bleed landscape photo, ~56vh tall.
7. **CTA band** — green-deep background, "Want me to take a look at your paddock?" with two buttons: yellow primary "Get a quote" → `/contact`, outlined secondary "See the work" → `/gallery`.
8. **Footer** — use the existing shared `<Footer />` component.

### Shared components to reuse

The phase 5 work should already have extracted these — use them, don't reimplement:

- `<SiteNav />` — same as every other page, set `active="about"` (or read pathname)
- `<Footer />` — same as every other page

If for some reason these weren't extracted in phase 5, extract them now as part of this work rather than duplicating the markup again. Three duplications is two too many.

### Design tokens

Use the existing CSS variables (`--jd-green`, `--jd-yellow`, `--ink`, `--cream` etc.) from `app/globals.css`. The mockup defines them inline at the top — these are the same tokens already in the global stylesheet, included in the mockup only to make it standalone-viewable. Don't redefine them in the about page.

Same for the font imports — Tenor Sans + DM Sans should already be loaded globally. The mockup re-imports them; the real page shouldn't.

### Content placement

Copy lives in the page component for v1. If you want, lift the longer-form copy into a co-located file:

```
app/about/
  page.tsx
  content.ts   ← optional, keeps the long-form story copy out of the JSX
```

This is a nice-to-have, not required.

### Things needing real content before launch

The mockup contains placeholder copy that Tom will overwrite — don't block the build on these:

- Story paragraphs (4 of them)
- Pull-quote
- £5m public liability figure — Tom to verify actual cover and adjust before launch
- Photo of Tom in the intro block (currently a stock image)
- Photo for the photo break section (currently a stock image)
- Hero photo

For the three image placeholders: pick real imported photos from the Media collection and hardcode the URLs for now. Wide landscape for hero, portrait for the intro photo, wide landscape for the photo break.

---

## Gotchas carried forward

- Next.js pinned to exact `15.4.11` for Payload 3.84 compat — don't bump
- `importMap` at `src/app/(payload)/admin/importMap.js`
- Layout needs `serverFunction` prop via `handleServerFunctions`
- Redirects enum values must be strings, not numbers

---

## Acceptance criteria

- [ ] `/about` renders all eight sections from the mockup in order
- [ ] Hero, intro block, story, credentials, service area, photo break, CTA band, footer all present
- [ ] Responsive: intro stacks on tablet, all sections degrade cleanly on mobile
- [ ] Uses shared `<SiteNav />` and `<Footer />` components, not duplicated markup
- [ ] CSS variables and fonts come from existing global setup, not redefined in-page
- [ ] Hero, intro photo, and photo-break all use real imported photos (not stock)
- [ ] CTA buttons link to `/contact` and `/gallery`
