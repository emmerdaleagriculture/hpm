import type { CollectionConfig } from 'payload';

/**
 * Media — every image, video, or file upload.
 *
 * Alt text is required for accessibility and SEO. Payload enforces this
 * at the field level.
 *
 * Storage: in production, this collection will be configured to store
 * files in Supabase Storage via @payloadcms/storage-s3. In development,
 * files are stored locally under /media/.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Media', plural: 'Media' },
  upload: {
    // Generate responsive sizes for <picture>/srcset
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 512, position: 'centre' },
      { name: 'feature', width: 1200, height: 800, position: 'centre' },
      { name: 'hero', width: 2000, height: 1200, position: 'centre' },
    ],
    // Strip EXIF / orientation — matters when owners upload phone photos
    formatOptions: {
      format: 'webp',
      options: { quality: 82 },
    },
    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/*', 'video/mp4', 'application/pdf'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: {
        description:
          'Describe the image in one short sentence for screen readers and SEO. Required.',
      },
    },
    {
      name: 'caption',
      type: 'text',
      admin: {
        description: 'Optional caption shown with the image on the site.',
      },
    },
    {
      name: 'credit',
      type: 'text',
      admin: {
        description: 'Optional photo credit.',
      },
    },
  ],
};
