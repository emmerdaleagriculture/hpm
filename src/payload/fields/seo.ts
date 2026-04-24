import type { Field } from 'payload';

/**
 * Reusable SEO field group.
 *
 * Every content type that produces a URL on the public site embeds this.
 * Fields match what Google, OpenGraph, and JSON-LD actually consume.
 *
 * Design notes:
 *  - metaTitle is separate from the document's internal title so authors
 *    can optimise for click-through without renaming the document
 *  - metaDescription has a 160-char soft limit (admin hint only — Payload
 *    doesn't truncate)
 *  - noIndex is a deliberate escape hatch for drafts or thin pages; default
 *    false
 *  - structuredDataOverride lets us attach custom JSON-LD per page (rare,
 *    but useful for service pages where we want explicit Service schema)
 */
export const seoFields: Field[] = [
  {
    name: 'seo',
    type: 'group',
    label: 'SEO',
    admin: {
      description:
        'Search engine & social sharing metadata. Leave blank to fall back to the document title and the first paragraph.',
    },
    fields: [
      {
        name: 'metaTitle',
        type: 'text',
        maxLength: 70,
        admin: {
          description: 'Shown in Google results and browser tabs. ~55–60 chars is ideal.',
        },
      },
      {
        name: 'metaDescription',
        type: 'textarea',
        maxLength: 200,
        admin: {
          description: 'Shown under the title in Google results. ~150–160 chars is ideal.',
        },
      },
      {
        name: 'ogImage',
        type: 'upload',
        relationTo: 'media',
        admin: {
          description: 'Image shown when this page is shared on Facebook, WhatsApp, etc. 1200×630 recommended.',
        },
      },
      {
        name: 'canonicalUrl',
        type: 'text',
        admin: {
          description: 'Override the canonical URL. Leave blank in 99% of cases.',
        },
      },
      {
        name: 'noIndex',
        type: 'checkbox',
        defaultValue: false,
        admin: {
          description: 'Tick to hide this page from search engines. Use sparingly.',
        },
      },
      {
        name: 'structuredDataOverride',
        type: 'json',
        admin: {
          description:
            'Optional JSON-LD override. Normally left blank — the site generates appropriate schema automatically.',
        },
      },
    ],
  },
];
