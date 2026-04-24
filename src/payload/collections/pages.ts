import type { CollectionConfig } from 'payload';
import { seoFields } from '../fields/seo';
import { slugField } from '../fields/slug';
import { allContentBlocks } from '../blocks/content-blocks';

/**
 * Pages — generic content pages with arbitrary content blocks.
 *
 * Use for: About, Contact, Costs, Tools, Privacy Policy, Gallery index.
 * Do NOT use for: Blog posts (use Posts), Service pages (use Services).
 *
 * The slug maps 1:1 to the URL. /about -> slug "about".
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status', 'updatedAt'],
    description:
      'Static content pages. Each page maps to /<slug>. Use this for About, Costs, Contact, and similar.',
  },
  access: {
    read: () => true, // Public
    // Create/update/delete defaults to authenticated-only
  },
  versions: {
    drafts: {
      autosave: { interval: 2000 },
      schedulePublish: true,
    },
    maxPerDoc: 20,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField('title'),
    {
      name: 'content',
      type: 'blocks',
      blocks: allContentBlocks,
      required: true,
    },
    ...seoFields,
  ],
};
