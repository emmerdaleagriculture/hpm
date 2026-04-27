# Changelog

All notable changes are recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com/) loosely; versions follow
[SemVer](https://semver.org/).

## [0.2.0] — 2026-04-27

First tagged release after the initial public launch. Covers everything
shipped since the early scaffold up to and including the post-launch
round of admin and mobile fixes.

### Added
- `/paddock-maintenance` pillar page (Phase 10).
- `/about`, `/contact` (+ `/quote`) and `/notes` (+ `/notes/[slug]`) pages.
- `/pricing` page, editable via a Payload global.
- `/admin-stats` analytics suite — GA4 traffic, Google Search Console
  dashboard, and a Plan tab.
- Editable Media admin with a `hideFromGallery` flag.
- Curated tag taxonomy auto-derivation on Posts (topping, weeds,
  seasonal, equipment, ground-care, advice, drainage, kit).
- Mobile dropdown nav with a dedicated close button.

### Fixed
- Lexical rich-text editor not loading inside the admin (caused by
  `experimental.optimizePackageImports` rewriting Payload barrel
  imports).
- Slug auto-fill on new blog posts — autosave's first save arrives as
  `update`, not `create`, so the previous `operation === 'create'`
  guard never fired.
- iOS form input zoom on `/contact` (16 px font).
- Mobile gallery breakpoint and lightbox touch targets (≥ 44 × 44).
- Hero content overlapping the brand text in the nav on /about, /notes,
  /contact and /gallery on mobile.

### Changed
- Lighthouse perf round: image sizes / CLS, deferred GA4, accessibility
  contrast.
- Bundle analyzer wired up behind `ANALYZE=true`.
- SEO: post / service / homepage metadata fed by Payload `seo.metaTitle`
  rather than hand-duplicated titles.
- Sitewide 24/7 messaging audit; mobile nav, 404 page, sitemap, robots,
  redirects (Phase 9 launch infra).

### Removed
- Unused `gallery-items` Payload collection (zero documents, zero
  consumers — `/gallery` reads from Media directly).

## [0.1.0] — initial

Initial scaffold: Next.js 15 App Router + Payload v3 + Supabase
(Postgres + S3-compatible storage), homepage, services, content
import from WordPress.
