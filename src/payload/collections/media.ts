import type { CollectionConfig } from 'payload';
import { revalidateTag } from 'next/cache';

// unstable_cache tag used by gallery/page.tsx so toggles in the admin
// reflect on the public site immediately rather than after the 5-min TTL.
const revalidateMedia = () => {
  try {
    revalidateTag('media');
  } catch {
    // revalidateTag throws if called outside a request scope (e.g. seed scripts).
    // Safe to ignore — the cache will refresh on its own TTL.
  }
};

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
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'hideFromGallery', 'showOnHomepageGallery', 'updatedAt'],
  },
  access: {
    // Public read — the frontend renders these images on every page.
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateMedia],
    afterDelete: [revalidateMedia],
  },
  upload: {
    // Generate responsive sizes for <picture>/srcset
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 512, position: 'centre' },
      { name: 'feature', width: 1200, height: 800, position: 'centre' },
      { name: 'hero', width: 2000, height: 1200, position: 'centre' },
      // Width-only (no height ⇒ no crop). For places that want the full
      // composition but at a sane bandwidth: hero photos, gallery lightbox.
      { name: 'large', width: 2000 },
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
    {
      name: 'showOnHomepageGallery',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Include this image in the 12-image homepage gallery grid.',
        components: {
          Cell: '@/payload/admin/BoolToggleCell#BoolToggleCell',
        },
      },
    },
    {
      name: 'hideFromGallery',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Exclude this image from the public /gallery page (and the homepage gallery).',
        components: {
          Cell: '@/payload/admin/BoolToggleCell#BoolToggleCell',
        },
      },
    },
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
    {
      name: 'wpUrl',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Original WordPress URL at time of import. Do not edit.',
      },
    },
  ],
};
