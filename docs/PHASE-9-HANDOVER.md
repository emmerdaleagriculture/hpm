# Phase 9 handover — Mobile nav, 404, and launch infrastructure

## What's in this handover

Three pieces of work bundled because they're all sitewide concerns:

1. **Mobile nav** — burger menu replacing the hidden desktop nav on small screens
2. **404 page** — on-brand "this field is empty" replacement for Next.js default
3. **Launch infrastructure** — sitemap, robots, redirects, analytics, SEO meta, privacy page route

Reference mockup: drop `mobile-nav-and-404-template.html` into `docs/` as `mobile-nav-and-404-mockup.html` before starting. The mockup contains both designs with a switcher at the bottom-left.

---

## 1. Mobile nav

### Behaviour

- Burger button appears below 900px breakpoint (right-side, in the existing nav padding)
- Tapping opens a **dropdown panel from the top of the screen** with a slight ease, behind a dimmed overlay
- Burger animates to an X when open
- Overlay tap, Escape key, or any link tap closes the menu
- Body scroll locked while menu open

### Contents

In order:

- Five nav links — Services, Gallery, Notes, About, Contact
- Divider
- "Call directly" eyebrow + phone number (`07825 156062`, big and yellow on hover)
- "Available any time, any day" subline
- Yellow "Get a quote →" button (full-width)

### Active link state

The currently-viewed page's nav link should display in JD yellow. Read the pathname in the `<SiteNav />` component (use `usePathname()` from `next/navigation`) and pass an `active` prop to each link.

### Where this lives

The mobile nav is part of the existing `<SiteNav />` component (extracted in Phase 5). Don't make it a separate component — the burger, mobile menu, and overlay are all part of the same nav element. The desktop nav and mobile nav share state (active link) and render conditionally based on viewport.

```tsx
// components/SiteNav.tsx — sketch
'use client'
export function SiteNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Lock body scroll, bind Escape, etc.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <nav>
        {/* brand, desktop links, desktop CTA, burger */}
      </nav>
      <div className={`mobile-menu-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <div className={`mobile-menu ${open ? 'open' : ''}`}>
        {/* nav links, phone, CTA */}
      </div>
    </>
  )
}
```

### Accessibility

- Burger has `aria-label="Open menu"`, `aria-expanded`, `aria-controls`
- Mobile menu has `aria-hidden` reflecting open state
- Focus the first nav link when menu opens
- Return focus to the burger when menu closes

---

## 2. 404 page — `app/not-found.tsx`

### Design

Full-bleed page, deep-green tinted photo background. Text and CTAs centred. Looks like a more dramatic version of the site's CTA bands, intentionally — the visual signals "you're somewhere unexpected, but you're still in our world".

### Content

- Eyebrow: `404`
- Headline: `This field is empty` with "empty" in italic Georgia yellow
- Body: "The page you were looking for has wandered off — or it was never here in the first place. Either way, let's get you back on a paddock that's actually being managed."
- Primary button: "Back to home" → `/`
- Secondary button: "Get a quote" → `/contact`
- Suggested links section: All services, Gallery, Notes from the field, About

### Implementation

In Next.js 15 App Router, the file `app/not-found.tsx` is the global 404. It renders inside the root layout, so `<SiteNav />` and `<Footer />` come along automatically — but **the 404 page in the mockup uses a full-bleed treatment without the standard nav/footer chrome**. Two ways to handle:

**Option A (preferred):** Keep the standard nav for orientation, drop the footer. Looks like every other page until you realise it's a 404. Less jarring.

**Option B:** Full bleed, no nav, no footer. More dramatic. Use a route group `app/(no-chrome)/not-found.tsx` if you want to opt out of the layout.

Go with A unless Tom prefers B.

---

## 3. Sitemap — `app/sitemap.ts`

Next.js App Router convention. Auto-generates `/sitemap.xml`.

```ts
import { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'

const SITE_URL = 'https://hampshirepaddockmanagement.co.uk'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config })

  // Static pages
  const staticPages = [
    '', // homepage
    '/services',
    '/gallery',
    '/notes',
    '/about',
    '/contact',
    '/privacy',
  ].map(path => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1.0 : 0.8,
  }))

  // Dynamic: services
  const services = await payload.find({ collection: 'services', limit: 0 })
  const servicePages = services.docs.map(s => ({
    url: `${SITE_URL}/services/${s.slug}`,
    lastModified: new Date(s.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Dynamic: notes posts
  const posts = await payload.find({ collection: 'posts', limit: 0 })
  const postPages = posts.docs.map(p => ({
    url: `${SITE_URL}/notes/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...servicePages, ...postPages]
}
```

---

## 4. Robots — `app/robots.ts`

```ts
import { MetadataRoute } from 'next'

const SITE_URL = 'https://hampshirepaddockmanagement.co.uk'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
```

---

## 5. Redirect map from old WordPress URLs

The old site had different slugs for several services, plus various WordPress and WooCommerce paths that don't exist on the new site. Rather than guessing, run the audit script first.

### Step 1: run the audit script

A small script is provided at `scripts/audit-slugs.mjs` (drop in from the handover bundle). Run from the repo root:

```bash
node scripts/audit-slugs.mjs
```

This produces `audit-slugs-report.md` listing every slug across Services, Pages, and Posts, flagging:

- Services whose slugs don't match the new-site list
- Known service slug remaps (e.g. `dung-sweeping` → `manure-sweeping`)
- Decisions needed (currently `field-ploughing` and `hedge-cutting` need Tom's call)
- A ready-to-paste redirect block for `next.config.mjs`

### Step 2: review the report

Tom needs to decide on any flagged items — typically one or two old service slugs that don't have an obvious new home. The script proposes likely targets but the call is Tom's.

### Step 3: paste redirects into `next.config.mjs`

The report's "Suggested redirect map" section is ready to drop in:

```js
// next.config.mjs
async redirects() {
  return [
    // Services renamed during the rebuild
    { source: '/services/dung-sweeping', destination: '/services/manure-sweeping', permanent: true },
    { source: '/services/fertiliser-spraying', destination: '/services/fertiliser-application', permanent: true },
    { source: '/services/field-harrowing', destination: '/services/harrowing', permanent: true },
    { source: '/services/field-rotavating', destination: '/services/rotavating', permanent: true },
    { source: '/services/paddock-rolling', destination: '/services/rolling', permanent: true },
    { source: '/services/ragwort-pulling', destination: '/services/weed-control', permanent: true },
    { source: '/services/seedsight', destination: '/services/overseeding', permanent: true },

    // field-ploughing and hedge-cutting — Tom to decide; add redirect lines here

    // Blog → Notes
    { source: '/blog/:slug', destination: '/notes/:slug', permanent: true },

    // WooCommerce artefacts
    { source: '/shop', destination: '/', permanent: true },
    { source: '/shop/:path*', destination: '/', permanent: true },
    { source: '/cart', destination: '/', permanent: true },
    { source: '/checkout', destination: '/', permanent: true },
    { source: '/my-account', destination: '/', permanent: true },
    { source: '/my-account/:path*', destination: '/', permanent: true },
    { source: '/wishlist', destination: '/', permanent: true },
    { source: '/products-compare', destination: '/', permanent: true },

    // Other old WP paths
    { source: '/tools', destination: '/#fleet', permanent: true },
    { source: '/costs', destination: '/services', permanent: true },
    { source: '/videos', destination: '/notes', permanent: true },
  ]
}
```

### Note on post slugs

The audit lists every post slug. The blanket `/blog/:slug → /notes/:slug` rule covers them all as long as the slugs came across unchanged from WordPress (which the import script aimed for). If any posts had their slugs altered during import — visible in the audit if a slug looks transformed — those need individual redirects.

---

## 6. Analytics — Plausible

The privacy policy commits to Plausible specifically. Set it up:

1. Tom registers the domain on plausible.io (paid, ~$9/month for the basic plan)
2. Add the script tag to the root layout — only on production, not in dev:

```tsx
// app/layout.tsx
{process.env.NODE_ENV === 'production' && (
  <script
    defer
    data-domain="hampshirepaddockmanagement.co.uk"
    src="https://plausible.io/js/script.js"
  />
)}
```

Plausible doesn't need cookie consent under GDPR (no PII, no cookies), which is why it was chosen over GA. Don't add cookie banners — they're not needed and they hurt conversion.

**Custom events to track** (optional, can be added after launch):

- Contact form submission
- Phone-link click on contact page (whenever someone taps `tel:` link)
- Service page CTA click
- 404 hits (tells you which old URLs are still being followed and need redirects)

Use `plausible('event-name')` calls.

---

## 7. SEO meta on every page

Every route needs proper metadata. Use Next.js `generateMetadata` or static `metadata` exports.

### Defaults in root layout

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://hampshirepaddockmanagement.co.uk'),
  title: {
    default: 'Hampshire Paddock Management — Specialist paddock work, run properly',
    template: '%s — Hampshire Paddock Management',
  },
  description: 'Modern, well-equipped paddock management across Hampshire and surrounding counties. Topping, harrowing, weed control, and more.',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: 'Hampshire Paddock Management',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
  },
}
```

### Per-page overrides

Each page that has its own meta:

```tsx
// app/about/page.tsx
export const metadata: Metadata = {
  title: 'About', // becomes "About — Hampshire Paddock Management" via the template
  description: 'Run by Tom Oswald. Specialist paddock work across Hampshire — modern kit, no subcontractors, the person you call is the person on the tractor.',
}
```

### Service detail and post pages

Use `generateMetadata` to pull from Payload:

```tsx
// app/services/[slug]/page.tsx
export async function generateMetadata({ params }) {
  const service = await getServiceBySlug(params.slug)
  return {
    title: service.title,
    description: service.metaDescription || service.shortDescription,
    openGraph: { images: [{ url: service.heroImage.url }] },
    alternates: { canonical: `/services/${service.slug}` },
  }
}
```

### OG images

For launch, a single default OG image (`/public/og-default.jpg`) is fine — should be 1200×630, branded, with the tagline. Per-page OG images can come later. Service and post pages should pull their hero image as OG.

---

## 8. Privacy policy — `app/privacy/page.tsx`

The privacy policy was drafted earlier in the project. It needs to be rendered as an actual route.

For v1, hardcode the content in the page component (or a co-located markdown file). Move to a Payload global later if Tom wants editable copy.

Layout: same chrome as other pages (nav + footer), single-column body identical to the about page's story body. Title "Privacy policy", date last updated, then the policy text.

The policy commits to:

- Plausible analytics (no cookies, no PII)
- Resend for form submission emails
- Supabase for data storage
- No third-party tracking
- Right to request data deletion via the contact form

Make sure these claims still match reality before launch — particularly the Plausible part, since this work is what makes that true.

Footer should link to `/privacy` (currently doesn't — add this).

---

## 9. Acceptance criteria

**Mobile nav**
- [ ] Burger button appears below 900px viewport
- [ ] Tapping burger slides menu down from top with overlay
- [ ] Active page highlighted in yellow
- [ ] Phone number and Get-a-quote CTA both present in mobile menu
- [ ] Body scroll locked when menu open
- [ ] Escape key closes menu
- [ ] Tapping any link or the overlay closes menu
- [ ] Burger animates to X when open
- [ ] ARIA attributes present and updated correctly

**404 page**
- [ ] `/some-nonexistent-url` renders the on-brand 404, not the default Next.js one
- [ ] "Back to home" and "Get a quote" buttons present and working
- [ ] Suggested links list working
- [ ] Site nav present (Option A from section 2)

**Sitemap & robots**
- [ ] `/sitemap.xml` accessible and lists all static pages, services, and posts
- [ ] `/robots.txt` accessible, references the sitemap, disallows /admin and /api

**Redirects**
- [ ] Audit script run; `audit-slugs-report.md` reviewed
- [ ] `/blog/*` → `/notes/*` working
- [ ] WooCommerce paths redirect to home
- [ ] `/tools` → `/#fleet`, `/costs` → `/services`, `/videos` → `/notes`
- [ ] All known service slug remaps in place (dung-sweeping, fertiliser-spraying, field-harrowing, field-rotavating, paddock-rolling, ragwort-pulling, seedsight)
- [ ] Flagged services (field-ploughing, hedge-cutting) resolved with Tom's input

**Analytics**
- [ ] Plausible script in production layout only
- [ ] Domain attribute matches the deployed domain
- [ ] No cookie banner

**SEO meta**
- [ ] Every page has a unique title and description
- [ ] OG image set on every page (default fallback or per-page)
- [ ] Canonical URLs set on dynamic pages
- [ ] Service and post pages use `generateMetadata`

**Privacy policy**
- [ ] `/privacy` renders as a proper page with site chrome
- [ ] Footer links to it
- [ ] Content matches what the site actually does (Plausible, Resend, Supabase, no third-party tracking)

---

## 10. Pre-launch checklist for Tom

Things that need confirming or providing before this work goes live:

- [ ] Audit script run, report reviewed, flagged decisions made (`field-ploughing` and `hedge-cutting` redirect targets)
- [ ] Plausible account created and domain registered
- [ ] OG default image designed and added to `/public/og-default.jpg`
- [ ] Resend sender domain verified
- [ ] Tom's receiving email address for contact form confirmed
- [ ] Phone number `07825 156062` confirmed correct
- [ ] Live domain DNS configured to point at Vercel deployment

---

## 11. Gotchas carried forward

- Next.js pinned to exact `15.4.11` for Payload 3.84 compat — don't bump
- `importMap` at `src/app/(payload)/admin/importMap.js`
- Layout needs `serverFunction` prop via `handleServerFunctions`
- Redirects enum values must be strings, not numbers
