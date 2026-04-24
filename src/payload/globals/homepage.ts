import type { GlobalConfig } from 'payload';
import { seoFields } from '../fields/seo';
import { allContentBlocks } from '../blocks/content-blocks';

/**
 * Homepage — singleton.
 *
 * Kept as a Global rather than a Page because there's exactly one, and
 * treating it as a singleton simplifies routing: the root URL (/) always
 * reads from this document, never from the Pages collection.
 *
 * This is the single most important document in the CMS. The current site's
 * homepage title is literally "Home - hampshirepaddockmanagement.com" which
 * is a huge wasted opportunity — fixing just the SEO here could double
 * homepage click-through.
 */
export const Homepage: GlobalConfig = {
  slug: 'homepage',
  label: 'Homepage',
  access: { read: () => true },
  versions: {
    drafts: { autosave: { interval: 2000 } },
    max: 20,
  },
  fields: [
    {
      name: 'hero',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text', required: true },
        { name: 'subheading', type: 'text' },
        { name: 'backgroundImage', type: 'upload', relationTo: 'media' },
        {
          name: 'ctas',
          type: 'array',
          maxRows: 2,
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'href', type: 'text', required: true },
            {
              name: 'variant',
              type: 'select',
              defaultValue: 'primary',
              options: [
                { label: 'Primary', value: 'primary' },
                { label: 'Secondary', value: 'secondary' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'featuredServices',
      type: 'relationship',
      relationTo: 'services',
      hasMany: true,
      admin: {
        description: 'Up to 6 services to feature on the homepage.',
      },
    },
    {
      name: 'stats',
      type: 'array',
      maxRows: 4,
      admin: { description: 'Short stat blocks shown on the home page (e.g. "59 years experience").' },
      fields: [
        { name: 'value', type: 'text', required: true },
        { name: 'label', type: 'text', required: true },
      ],
    },
    {
      name: 'content',
      type: 'blocks',
      blocks: allContentBlocks,
      admin: {
        description: 'Additional home-page sections below the hero.',
      },
    },
    ...seoFields,
  ],
};
