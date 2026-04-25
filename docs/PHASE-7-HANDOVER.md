# Phase 7 handover — Contact / Quote page

## What's in this handover

Build the enquiry page at two URLs (`/contact` and `/quote`) sharing the same form. This is the conversion surface — every CTA on the site lands here.

Reference mockup: drop `contact-page-template.html` into `docs/` as `contact-page-mockup.html` before starting.

---

## 1. Routing — same page at two URLs

The page lives at both `/contact` and `/quote`. Two clean ways to do this in Next.js 15:

**Option A — single route + redirect/rewrite (preferred)**

Build the page at `/app/contact/page.tsx`. Add a rewrite in `next.config.mjs` so `/quote` serves the same page without a redirect:

```js
async rewrites() {
  return [
    { source: '/quote', destination: '/contact' },
  ]
}
```

Rewrite (not redirect) keeps the URL the user typed — `/quote` stays `/quote` in the address bar. That matters because external links and CTAs may use either, and we want both to feel like first-class URLs.

**Option B — duplicate route file**

Create `/app/quote/page.tsx` that just re-exports the contact page component. Works fine, slightly more drift risk.

Go with A.

---

## 2. Page build — `/app/contact/page.tsx`

### Structure

Two-column on desktop, stacks on mobile:

- **Left column (1.5fr):** Form
- **Right column (1fr):** Three sidebar panels — "What happens next", "Or call directly", "Where I work"

The mockup has the full markup and CSS. Use shared `<SiteNav />` (active="contact") and `<Footer />` components from earlier phases — don't duplicate.

### Form fields

```
name           (required)        text
phone          (required)        tel
email          (optional)        email
location       (required)        text — placeholder: "Nearest village or postcode"
service        (optional)        select — grouped optgroups, default = "Not sure yet — I'll explain when we talk"
message        (optional)        textarea
```

Service dropdown uses the same three groupings as the footer (Cutting & mowing / Ground care / Treatment & upkeep). All 15 service slugs in the mockup.

Phone validation is intentionally loose — `required` only, no regex. People enter UK mobile numbers in a dozen formats and rejecting any of them just makes them angry.

### Service preselection from URL param

`?service=paddock-topping` should pre-select that service in the dropdown. The mockup has working JS for this; in React, do it with `useSearchParams`:

```tsx
'use client'
import { useSearchParams } from 'next/navigation'

const params = useSearchParams()
const preselected = params.get('service') ?? ''

<select defaultValue={preselected} ...>
```

This wires up the gallery, service detail, about, and homepage CTAs so they land on the form with the right context already chosen.

### Submission flow

1. Client validates required fields (name, phone, location)
2. POST to `/api/contact` (server route)
3. Server validates again, then hits Resend
4. On success, client hides the form and shows the success state inline (mockup has the markup — green-bordered panel with checkmark, "Got it — thanks", and a "Send another" button that resets the form)
5. The "Send another" button re-applies the URL param preselection if there was one

No redirect to a thank-you page. Stay on `/contact` (or `/quote`).

### `/api/contact` handler

```ts
// app/api/contact/route.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const body = await req.json()
  const { name, phone, email, location, service, message } = body

  // Server-side validation — never trust client
  if (!name?.trim() || !phone?.trim() || !location?.trim()) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Basic length cap to deter abuse
  if (message && message.length > 5000) {
    return Response.json({ error: 'Message too long' }, { status: 400 })
  }

  await resend.emails.send({
    from: 'HPM website <noreply@hampshirepaddockmanagement.co.uk>', // adjust to verified sender
    to: ['tom@...'], // Tom's actual receiving address — confirm before launch
    replyTo: email || undefined,
    subject: `New enquiry from ${name}${service ? ` — ${service}` : ''}`,
    text: formatEnquiryEmail({ name, phone, email, location, service, message }),
  })

  return Response.json({ ok: true })
}
```

The verified sender domain and Tom's receiving address need confirming before the build is live — flag as a launch blocker if either is unset.

### Anti-spam

Form will get hit. At a minimum:

- Honeypot field (`<input name="website" style="display:none">` — real users leave it blank, bots fill it)
- Cloudflare Turnstile or hCaptcha if spam volume warrants — not needed in v1, add if it becomes a problem
- Rate-limit the API route to N submissions per IP per hour (use a simple in-memory store or Upstash Redis)

Don't add a CAPTCHA preemptively — they meaningfully reduce conversion.

### Phone number

Display: **07825 156062**
`tel:` link: `tel:+447825156062`

This is referenced in three places: the call panel, the footer, and (likely) the homepage's yellow phone strip. Worth pulling into a single `SITE_PHONE` constant so it can be updated in one place.

### Hours / availability messaging

The page commits to a 24/7 callable promise with realistic acknowledgement that calls may roll to voicemail. Specific wording in the mockup:

- Hero subhead: "Usually replies within hours, day or night."
- Call panel: "Available any time, any day. If I can't pick up, leave a message and I'll come back to you."
- Step 1: "I'll reply quickly — usually within hours, day or night."
- Submit button helper: "Usually replies within hours"
- Success state: "I'll be in touch on the number you've given me — usually within hours."

These are now a sitewide brand promise and need to be consistent. **Audit the homepage and about page during this build** — if they reference different response-time promises (e.g. "next working day"), update them to match.

---

## 3. Sidebar content (hardcoded for v1)

All three sidebar panels are static content. Lift to a Payload global later if Tom wants editable copy without a deploy; not needed now.

Three panels, in order:

1. **What happens next** — three numbered steps. Step 2 explicitly says most jobs are quoted by phone from a description, with site visits only when needed and free of charge.
2. **Or call directly** — green-deep background, big yellow phone number, 24/7 messaging.
3. **Where I work** — Hampshire / Wiltshire / West Sussex / Surrey / Berkshire / Dorset, "further afield by arrangement".

---

## 4. Acceptance criteria

- [ ] `/contact` and `/quote` both serve the same page (rewrite, not redirect)
- [ ] Two-column desktop layout, stacked mobile, matches mockup
- [ ] Uses shared `<SiteNav />` (active="contact") and `<Footer />`
- [ ] All six form fields render with correct labels and required markers
- [ ] Service dropdown grouped using `<optgroup>`, default option "Not sure yet — I'll explain when we talk"
- [ ] `?service=paddock-topping` preselects the matching service
- [ ] Required-field validation works client-side, errors highlighted inline
- [ ] Form submits to `/api/contact`, which hits Resend
- [ ] Success state shows inline (no redirect), with reset-and-restart button
- [ ] Honeypot field present and checked server-side
- [ ] API route rate-limited per IP
- [ ] Phone number displayed as `07825 156062`, `tel:` link uses `+447825156062`
- [ ] Phone number sourced from a single `SITE_PHONE` constant used in nav, footer, and call panel
- [ ] All response-time messaging on homepage and about page audited and made consistent with the 24/7 promise

---

## 5. Gotchas carried forward

- Next.js pinned to exact `15.4.11` for Payload 3.84 compat — don't bump
- `importMap` at `src/app/(payload)/admin/importMap.js`
- Layout needs `serverFunction` prop via `handleServerFunctions`
- Redirects enum values must be strings, not numbers

---

## 6. Launch blockers to confirm

Before this page goes to production, confirm with Tom:

- [ ] Receiving email address for enquiries
- [ ] Resend sender domain verified (likely `hampshirepaddockmanagement.co.uk` or similar)
- [ ] Phone number `07825 156062` correct and ringable
