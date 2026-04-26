import type { GlobalConfig } from 'payload';

/**
 * GscAuth — singleton storing the OAuth refresh token granted by an
 * admin clicking "Connect to Google" once.
 *
 * Service-account auth is disabled by default GCP org policy
 * (iam.disableServiceAccountKeyCreation), so we use the standard
 * OAuth web-server flow with the admin's own Google account that
 * already has Search Console access. The refresh token is good
 * indefinitely once the OAuth app leaves "testing" mode.
 *
 * Read access is admin-only — the token is bearer credential equivalent
 * to whatever access the granting admin had.
 */
export const GscAuth: GlobalConfig = {
  slug: 'gsc-auth',
  label: 'Search Console auth',
  access: {
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    group: 'Admin',
    description:
      'OAuth credentials for the Search Console dashboard. Set via the connect flow at /admin-stats/auth/connect — do not hand-edit.',
    hideAPIURL: true,
  },
  fields: [
    {
      name: 'refreshToken',
      type: 'text',
      admin: {
        readOnly: true,
        description:
          'Long-lived OAuth refresh token. Cleared by hand to force a re-auth.',
      },
    },
    {
      name: 'connectedEmail',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Email of the Google account whose token is stored.',
      },
    },
    {
      name: 'connectedAt',
      type: 'date',
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
  ],
};
