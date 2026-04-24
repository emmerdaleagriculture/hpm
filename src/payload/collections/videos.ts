import type { CollectionConfig } from 'payload';

/**
 * Videos — entries for the /videos page.
 *
 * Most videos will be YouTube embeds. Self-hosted supported for cases
 * where you want to bypass YouTube entirely.
 */
export const Videos: CollectionConfig = {
  slug: 'videos',
  labels: { singular: 'Video', plural: 'Videos' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'provider', 'date'],
    description: 'Videos shown on the /videos page.',
  },
  access: { read: () => true },
  defaultSort: '-date',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'date', type: 'date', required: true, defaultValue: () => new Date() },
    {
      name: 'provider',
      type: 'select',
      defaultValue: 'youtube',
      required: true,
      options: [
        { label: 'YouTube', value: 'youtube' },
        { label: 'Vimeo', value: 'vimeo' },
        { label: 'Self-hosted', value: 'self' },
      ],
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData?.provider !== 'self',
        description: 'YouTube/Vimeo URL.',
      },
    },
    {
      name: 'file',
      type: 'upload',
      relationTo: 'media',
      admin: { condition: (_, siblingData) => siblingData?.provider === 'self' },
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optional custom thumbnail. If blank, provider default is used.' },
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'service',
      type: 'relationship',
      relationTo: 'services',
      admin: { description: 'Optional — link to a related service.' },
    },
  ],
};
