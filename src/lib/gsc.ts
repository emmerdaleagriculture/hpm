import crypto from 'node:crypto';

/**
 * Google Search Console client.
 *
 * Uses a service-account JWT bearer flow (RFC 7523) to mint an OAuth
 * access token, then queries searchAnalytics.query. No external auth
 * library — Node crypto handles the RS256 signing.
 *
 * Required env vars:
 *   GSC_SERVICE_ACCOUNT_EMAIL       e.g. svc@project.iam.gserviceaccount.com
 *   GSC_SERVICE_ACCOUNT_PRIVATE_KEY PEM block. Vercel UI escapes newlines
 *                                   to literal "\n" — we handle that here.
 *   GSC_SITE_URL                    Either a URL-prefix property
 *                                   ("https://hampshirepaddockmanagement.com/")
 *                                   or domain ("sc-domain:hampshirepaddockmanagement.com").
 *
 * The service account must be added as a User (any role) on the GSC
 * property at https://search.google.com/search-console/users.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(email: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(
    JSON.stringify({
      iss: email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = base64url(signer.sign(privateKey));
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`GSC token exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: now + json.expires_in };
  return json.access_token;
}

export type GscRow = {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscQueryArgs = {
  startDate: string;
  endDate: string;
  dimensions?: Array<'query' | 'page' | 'date' | 'country' | 'device'>;
  rowLimit?: number;
};

export async function gscQuery(args: GscQueryArgs): Promise<GscRow[]> {
  const email = process.env.GSC_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GSC_SERVICE_ACCOUNT_PRIVATE_KEY;
  const siteUrl = process.env.GSC_SITE_URL;
  if (!email || !rawKey || !siteUrl) {
    throw new Error('GSC not configured (need GSC_SERVICE_ACCOUNT_EMAIL, GSC_SERVICE_ACCOUNT_PRIVATE_KEY, GSC_SITE_URL)');
  }
  // Vercel and similar env stores escape newlines to literal "\n".
  const privateKey = rawKey.replace(/\\n/g, '\n');

  const token = await getAccessToken(email, privateKey);
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: args.startDate,
      endDate: args.endDate,
      dimensions: args.dimensions ?? [],
      rowLimit: args.rowLimit ?? 25,
    }),
  });
  if (!res.ok) {
    throw new Error(`GSC query failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { rows?: GscRow[] };
  return json.rows ?? [];
}

/** YYYY-MM-DD, n days before today (UTC). */
export function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function isGscConfigured(): boolean {
  return Boolean(
    process.env.GSC_SERVICE_ACCOUNT_EMAIL &&
      process.env.GSC_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GSC_SITE_URL,
  );
}
