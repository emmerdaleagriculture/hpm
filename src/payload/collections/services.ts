import type { CollectionConfig } from 'payload';
import { seoFields } from '../fields/seo';
import { slugField } from '../fields/slug';
import { allContentBlocks } from '../blocks/content-blocks';
import { autoDerive } from '../hooks/auto-derive';

/**
 * Services — the 11 (and growing) service pages.
 *
 * These are structurally similar and deserve dedicated fields rather than
 * being generic Pages. This lets us:
 *   - List all services on /services/ with consistent formatting
 *   - Generate Service schema.org JSON-LD automatically
 *   - Support "related services" blocks
 *   - Standardise pricing/equipment info across services
 *
 * URL pattern: /<slug>  (matches existing /field-harrowing/, /paddock-topping/
 * etc. — we do NOT move them under /services/<slug> because that would break
 * rankings.)
 */
export const Services: CollectionConfig = {
  slug: 'services',
  labels: { singular: 'Service', plural: 'Services' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'orderInMenu', '_status'],
    description:
      'Service pages (harrowing, topping, rolling, etc.). Each maps to /<slug>.',
  },
  access: {
    read: () => true,
  },
  versions: {
    drafts: { autosave: { interval: 2000 } },
    maxPerDoc: 20,
  },
  hooks: {
    beforeValidate: [autoDerive({ shortDescription: true })],
  },
  defaultSort: 'orderInMenu',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField('title'),
    {
      name: 'shortDescription',
      type: 'textarea',
      maxLength: 300,
      required: true,
      admin: {
        description: 'One-sentence summary shown on /services/ index and in related-services lists.',
      },
    },
    {
      name: 'strapline',
      type: 'text',
      maxLength: 180,
      admin: {
        description: 'One-line strapline shown under the hero title on the service page. Italic fragments work — wrap with <em>…</em>.',
      },
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'orderInMenu',
      type: 'number',
      defaultValue: 100,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first on the services index. Use 10, 20, 30… so you can insert between.',
      },
    },
    {
      name: 'category',
      type: 'select',
      options: [
        { label: 'Cutting & mowing', value: 'cutting-mowing' },
        { label: 'Ground care', value: 'ground-care' },
        { label: 'Treatment & upkeep', value: 'treatment-upkeep' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Groups this service on the footer and /services index. Services with no category set still have their own page but won’t appear in those grouped lists.',
      },
    },
    {
      name: 'featuredOnHomepage',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Feature this service on the homepage. Pick exactly 5 — the first is shown as a large feature tile, the other 4 as smaller tiles.',
      },
    },
    {
      name: 'homepageTagline',
      type: 'text',
      maxLength: 40,
      admin: {
        description: 'Short tag shown above the service name on the homepage tile (e.g. "Most popular", "Countryside · verges"). Kept short deliberately.',
        condition: (_, siblingData) => Boolean(siblingData?.featuredOnHomepage),
      },
    },
    {
      name: 'pricing',
      type: 'group',
      admin: {
        description: 'Optional — leave blank if pricing is quote-only.',
      },
      fields: [
        {
          name: 'model',
          type: 'select',
          options: [
            { label: 'Quote on enquiry', value: 'quote' },
            { label: 'From price', value: 'from' },
            { label: 'Fixed price', value: 'fixed' },
            { label: 'Per acre', value: 'per-acre' },
            { label: 'Per hour', value: 'per-hour' },
          ],
          defaultValue: 'quote',
        },
        {
          name: 'amount',
          type: 'number',
          admin: {
            condition: (_, siblingData) => siblingData?.model && siblingData.model !== 'quote',
          },
        },
        {
          name: 'currency',
          type: 'select',
          defaultValue: 'GBP',
          options: [{ label: 'GBP (£)', value: 'GBP' }],
        },
        {
          name: 'note',
          type: 'text',
          admin: { description: 'e.g. "minimum 1 acre", "subject to access"' },
        },
      ],
    },
    {
      name: 'equipment',
      type: 'array',
      admin: {
        description: 'Machinery used for this service. Shown in the sidebar of the service page.',
      },
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'spec',
          type: 'text',
          admin: {
            description: 'Short spec shown under the name (e.g. "65 hp compact · grass tyres").',
          },
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Optional. Not currently shown on the service page.' },
        },
      ],
    },
    {
      name: 'metaHighlights',
      type: 'group',
      label: 'At a glance',
      admin: {
        description: 'Four short facts shown in the sidebar. Leave any blank to hide that row.',
      },
      fields: [
        { name: 'bestTime', type: 'text', admin: { description: 'e.g. "May / August"' } },
        { name: 'frequency', type: 'text', admin: { description: 'e.g. "1–2 × season"' } },
        { name: 'minPaddock', type: 'text', admin: { description: 'e.g. "¼ acre"' } },
        { name: 'quoteTurnaround', type: 'text', admin: { description: 'e.g. "Same day"' } },
      ],
    },
    {
      name: 'relatedServices',
      type: 'relationship',
      relationTo: 'services',
      hasMany: true,
      maxRows: 3,
      admin: {
        description: 'Up to 3 related services to surface at the bottom of this page.',
      },
    },
    {
      name: 'content',
      type: 'blocks',
      blocks: allContentBlocks,
    },
    ...seoFields,
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
  ],
};
