import type { Field } from 'payload';

/**
 * URL slug with auto-generation.
 *
 * On create: if slug is blank, derive from title.
 * On update: do NOT auto-regenerate — changing a published slug breaks URLs
 * and costs rankings. Force authors to change it deliberately.
 */
export const slugField = (sourceField = 'title'): Field => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description:
      'URL path for this page. Avoid changing once published — it will break existing links and SEO rankings.',
  },
  hooks: {
    beforeValidate: [
      ({ data, operation, value }) => {
        // Only auto-generate on create, never on update
        if (operation === 'create' && !value && data?.[sourceField]) {
          return String(data[sourceField])
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80);
        }
        return value;
      },
    ],
  },
});
