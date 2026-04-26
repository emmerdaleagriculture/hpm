import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'node:crypto';
import { getPayload } from 'payload';
import config from '@payload-config';
import { buildAuthUrl, isGscOAuthConfigured } from '@/lib/gsc';

export const dynamic = 'force-dynamic';

/**
 * GET /admin-stats/auth/connect
 *
 * Auth-gated. Generates a CSRF state token, stashes it in a cookie,
 * then 302s the admin to Google's consent screen. The callback at
 * /admin-stats/auth/callback verifies the same state.
 */
export async function GET(req: Request) {
  const payload = await getPayload({ config });
  const h = await headers();
  const { user } = await payload.auth({ headers: h });
  if (!user) {
    return NextResponse.redirect(
      new URL('/admin/login?redirect=/admin-stats', req.url),
    );
  }

  if (!isGscOAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          'OAuth client is not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GSC_SITE_URL.',
      },
      { status: 503 },
    );
  }

  const origin = new URL(req.url).origin;
  const state = crypto.randomBytes(24).toString('hex');
  const target = buildAuthUrl(origin, state);

  const res = NextResponse.redirect(target);
  // Short-lived state cookie — verified by the callback.
  res.cookies.set('gsc_oauth_state', state, {
    httpOnly: true,
    secure: origin.startsWith('https://'),
    sameSite: 'lax',
    maxAge: 600,
    path: '/admin-stats/auth',
  });
  return res;
}
