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
        description: 'Machinery used for this service. Links to tools.',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'relatedServices',
      type: 'relationship',
      relationTo: 'services',
      hasMany: true,
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
