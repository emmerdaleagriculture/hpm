import type { Field } from 'payload';

/**
 * URL slug with auto-generation.
 *
 * Auto-derives from `sourceField` (title) whenever the slug is blank.
 * Once a slug exists it's never overwritten — that protects published
 * URLs from being silently changed when the title is edited later.
 *
 * We can't gate on `operation === 'create'` because Payload's autosave
 * creates the draft row with empty fields first and then arrives as
 * `update` for every keystroke — so the "first" save authors see is
 * already an update, and `create` never matches.
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
      ({ data, siblingData, value }) => {
        if (value) return value;
        const src = data?.[sourceField] ?? siblingData?.[sourceField];
        if (!src) return value;
        return String(src)
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 80);
      },
    ],
  },
});
