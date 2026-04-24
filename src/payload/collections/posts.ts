import type { CollectionConfig } from 'payload';
import { seoFields } from '../fields/seo';
import { slugField } from '../fields/slug';
import { allContentBlocks } from '../blocks/content-blocks';

/**
 * Posts — blog posts.
 *
 * URL pattern: /<slug>  (NOT /blog/<slug>, to match the existing WP structure
 * and preserve rankings. The /blog/ route is a listing page, not a prefix.)
 *
 * Category is deliberately a simple enum rather than a relation — we don't
 * need a whole Categories collection for the two groupings that matter.
 * If that changes, upgrade to a relation later.
 */
export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Blog post', plural: 'Blog posts' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'status', 'publishedAt'],
    description: 'Blog posts. Each maps to /<slug>.',
  },
  access: {
    read: () => true,
  },
  versions: {
    drafts: {
      autosave: { interval: 2000 },
      schedulePublish: true,
    },
    maxPerDoc: 20,
  },
  defaultSort: '-publishedAt',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField('title'),
    {
      name: 'excerpt',
      type: 'textarea',
      maxLength: 300,
      admin: {
        description: 'Short summary shown on the blog index and in link previews.',
      },
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'paddock',
      options: [
        { label: 'Paddock & Land Management', value: 'paddock' },
        { label: 'Machinery Reviews', value: 'machinery' },
        { label: 'Case Studies', value: 'case-study' },
        { label: 'Commentary (Videscape/Clickasnap)', value: 'commentary' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Controls where the post appears. "Commentary" posts are kept on the blog but not featured on the paddock-focused home/services areas.',
      },
    },
    {
      name: 'tags',
      type: 'array',
      admin: { position: 'sidebar' },
      fields: [{ name: 'tag', type: 'text' }],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            // Auto-set on first publish
            if (siblingData._status === 'published' && !value) {
              return new Date();
            }
            return value;
          },
        ],
      },
    },
    {
      name: 'content',
      type: 'blocks',
      blocks: allContentBlocks,
      required: true,
    },
    ...seoFields,
  ],
};
