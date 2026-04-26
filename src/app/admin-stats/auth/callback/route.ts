import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPayload } from 'payload';
import config from '@payload-config';
import { exchangeCodeForTokens, fetchUserEmail } from '@/lib/gsc';

export const dynamic = 'force-dynamic';

/**
 * GET /admin-stats/auth/callback
 *
 * Google redirects here after the user grants/denies consent.
 * Validates the CSRF state, exchanges the code for tokens, stores
 * the refresh token in the `gsc-auth` global, then redirects to
 * /admin-stats.
 */
export async function GET(req: Request) {
  // No payload.auth() call here — Google's redirect doesn't always
  // forward the admin session cookie (depends on browser cross-site
  // cookie behaviour). The CSRF state cookie we set in `connect/` is
  // httpOnly + same-origin, so a matching state proves the request
  // started from a logged-in admin on this server. That's the auth.
  const payload = await getPayload({ config });

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const errParam = url.searchParams.get('error');

  if (errParam) {
    return NextResponse.redirect(
      new URL(`/admin-stats?gsc_error=${encodeURIComponent(errParam)}`, req.url),
    );
  }
  if (!code || !stateParam) {
    return NextResponse.redirect(
      new URL('/admin-stats?gsc_error=missing_code_or_state', req.url),
    );
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get('gsc_oauth_state')?.value;
  if (!stateCookie || stateCookie !== stateParam) {
    return NextResponse.redirect(
      new URL('/admin-stats?gsc_error=state_mismatch', req.url),
    );
  }

  try {
    const { refreshToken, accessToken } = await exchangeCodeForTokens(
      code,
      url.origin,
    );
    const email = await fetchUserEmail(accessToken);

    await payload.updateGlobal({
      slug: 'gsc-auth',
      data: {
        refreshToken,
        connectedEmail: email ?? null,
        connectedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.redirect(
      new URL(`/admin-stats?gsc_error=${encodeURIComponent(msg)}`, req.url),
    );
  }

  const res = NextResponse.redirect(new URL('/admin-stats?gsc_connected=1', req.url));
  res.cookies.delete('gsc_oauth_state');
  return res;
}
