import type { CollectionConfig } from 'payload';

/**
 * GalleryItem — entries for the /gallery page.
 *
 * Kept as its own collection rather than a page block because:
 *  - You'll add to it frequently (after every job)
 *  - We want to tag by service type and location for filtering
 *  - Each item can have multiple photos + a short write-up
 */
export const GalleryItems: CollectionConfig = {
  slug: 'gallery-items',
  labels: { singular: 'Gallery item', plural: 'Gallery items' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'service', 'location', 'date'],
    description: 'Before/after and in-progress photos of jobs. Shown on /gallery.',
  },
  access: { read: () => true },
  defaultSort: '-date',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'e.g. "Ragwort clearance — 3 acres, East Meon"' },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      defaultValue: () => new Date(),
    },
    {
      name: 'service',
      type: 'relationship',
      relationTo: 'services',
      admin: {
        description: 'Which service this job demonstrates.',
      },
    },
    {
      name: 'location',
      type: 'text',
      admin: { description: 'e.g. "East Meon, Hampshire". Keep the specific address off — privacy.' },
    },
    {
      name: 'photos',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'photo', type: 'upload', relationTo: 'media', required: true },
        {
          name: 'phase',
          type: 'select',
          defaultValue: 'during',
          options: [
            { label: 'Before', value: 'before' },
            { label: 'During', value: 'during' },
            { label: 'After', value: 'after' },
            { label: 'General', value: 'general' },
          ],
        },
      ],
    },
    {
      name: 'notes',
      type: 'richText',
      admin: { description: 'Optional short write-up. What was the job? Any challenges?' },
    },
  ],
};
