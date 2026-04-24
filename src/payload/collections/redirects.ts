import type { CollectionConfig } from 'payload';

/**
 * Redirects — managed via the admin rather than hardcoded.
 *
 * Why a collection and not a static config file:
 *  - Post-launch we will spot new 404s in Vercel logs and need to add
 *    redirects without a code deploy
 *  - Non-devs may need to add redirects
 *  - We want an audit trail (createdAt, updatedAt, notes) for compliance
 *
 * The Next.js middleware reads this table on request. Results are cached
 * aggressively (see middleware.ts) so there's no per-request DB hit.
 */
export const Redirects: CollectionConfig = {
  slug: 'redirects',
  labels: { singular: 'Redirect', plural: 'Redirects' },
  admin: {
    useAsTitle: 'from',
    defaultColumns: ['from', 'to', 'statusCode', 'active', 'updatedAt'],
    description: '301/302/410 rules handled by the edge middleware.',
  },
  access: { read: () => true },
  fields: [
    {
      name: 'from',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description:
          'Old path, e.g. /cart/. Must start with a slash. No domain, no querystring.',
      },
    },
    {
      name: 'to',
      type: 'text',
      admin: {
        description:
          'New path or absolute URL. Leave blank for 410 Gone. Starts with / for internal paths.',
        condition: (_, data) => data?.statusCode !== '410',
      },
    },
    {
      name: 'statusCode',
      type: 'select',
      required: true,
      defaultValue: '301',
      options: [
      { label: '301 — Permanent', value: '301' },
        { label: '302 — Temporary', value: '302' },
        { label: '410 — Gone (remove)', value: '410' },
      ],
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Optional. Why does this redirect exist?',
      },
    },
  ],
};
