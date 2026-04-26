import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@payload-config';

import {
  isGscConnected,
  isGscOAuthConfigured,
} from '@/lib/gsc';
import styles from '@/app/admin-stats/admin-stats.module.css';
import { SubNav } from './SubNav';

/**
 * Shared "is the user logged in + GSC connected" check used by every
 * /admin-stats/* sub-page. Returns either a JSX placeholder (auth/setup
 * needed) or null when ready to render the real page.
 */
export async function adminStatsGuard(activePath: string): Promise<{
  block: React.ReactNode | null;
}> {
  const payload = await getPayload({ config });
  const h = await headers();
  const { user } = await payload.auth({ headers: h });
  if (!user) {
    redirect(`/admin/login?redirect=${encodeURIComponent(activePath)}`);
  }

  if (!isGscOAuthConfigured()) {
    return {
      block: (
        <main className={styles.page}>
          <SubNav active={activePath} />
          <section className={styles.notConfigured}>
            <h2>OAuth not configured</h2>
            <p>
              Set <code>GOOGLE_OAUTH_CLIENT_ID</code>,{' '}
              <code>GOOGLE_OAUTH_CLIENT_SECRET</code>, and{' '}
              <code>GSC_SITE_URL</code> in env to enable this dashboard.
            </p>
          </section>
        </main>
      ),
    };
  }

  if (!(await isGscConnected())) {
    return {
      block: (
        <main className={styles.page}>
          <SubNav active={activePath} />
          <section className={styles.notConfigured}>
            <h2>Connect your Google account</h2>
            <p>
              Click below and grant Search Console + Analytics read access.
              The token persists until revoked, so this is a one-time step.
            </p>
            <p style={{ marginTop: '1rem' }}>
              <Link
                href="/admin-stats/auth/connect"
                className={styles.connectButton}
              >
                Connect to Google →
              </Link>
            </p>
          </section>
        </main>
      ),
    };
  }

  return { block: null };
}
