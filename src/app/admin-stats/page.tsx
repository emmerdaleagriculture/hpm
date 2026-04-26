import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@payload-config';

import {
  gscQuery,
  isoDaysAgo,
  isGscConnected,
  isGscOAuthConfigured,
} from '@/lib/gsc';
import styles from './admin-stats.module.css';

export const metadata: Metadata = {
  title: 'Search Console — HPM Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const RANGE_DAYS = 28;
const GSC_LAG_DAYS = 3;

function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}
function fmtNumber(n: number) {
  return n.toLocaleString('en-GB');
}
function fmtPosition(n: number) {
  return n.toFixed(1);
}

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const payload = await getPayload({ config });
  const h = await headers();
  const { user } = await payload.auth({ headers: h });
  if (!user) redirect('/admin/login?redirect=/admin-stats');

  const sp = await searchParams;
  const oauthError = typeof sp.gsc_error === 'string' ? sp.gsc_error : null;
  const justConnected = sp.gsc_connected === '1';

  const oauthConfigured = isGscOAuthConfigured();
  const connected = oauthConfigured ? await isGscConnected() : false;

  if (!oauthConfigured) {
    return (
      <main className={styles.page}>
        <header className={styles.head}>
          <h1>Search Console</h1>
          <Link href="/admin" className={styles.back}>
            ← Back to admin
          </Link>
        </header>
        <section className={styles.notConfigured}>
          <h2>OAuth not configured</h2>
          <p>Three env vars are required:</p>
          <ul>
            <li>
              <code>GOOGLE_OAUTH_CLIENT_ID</code>
            </li>
            <li>
              <code>GOOGLE_OAUTH_CLIENT_SECRET</code>
            </li>
            <li>
              <code>GSC_SITE_URL</code> — e.g.{' '}
              <code>sc-domain:hampshirepaddockmanagement.com</code>
            </li>
          </ul>
          <p>
            Create the OAuth client in GCP at{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener"
            >
              APIs & Services → Credentials
            </a>{' '}
            (type: Web application). Add the redirect URI{' '}
            <code>{`{site}/admin-stats/auth/callback`}</code> for both prod and{' '}
            <code>http://localhost:3000/admin-stats/auth/callback</code> for dev.
          </p>
        </section>
      </main>
    );
  }

  if (!connected) {
    return (
      <main className={styles.page}>
        <header className={styles.head}>
          <h1>Search Console</h1>
          <Link href="/admin" className={styles.back}>
            ← Back to admin
          </Link>
        </header>
        <section className={styles.notConfigured}>
          <h2>Connect your Google account</h2>
          <p>
            Click below and grant Search Console read access. The token persists
            until you revoke it from your Google account, so this is a one-time step.
          </p>
          <p style={{ marginTop: '1rem' }}>
            <a href="/admin-stats/auth/connect" className={styles.connectButton}>
              Connect to Google →
            </a>
          </p>
          {oauthError && (
            <p className={styles.errorInline}>
              Last attempt failed: <code>{oauthError}</code>
            </p>
          )}
        </section>
      </main>
    );
  }

  const endDate = isoDaysAgo(GSC_LAG_DAYS);
  const startDate = isoDaysAgo(GSC_LAG_DAYS + RANGE_DAYS);

  let totals: { clicks: number; impressions: number; ctr: number; position: number } | null =
    null;
  let queries: Awaited<ReturnType<typeof gscQuery>> = [];
  let pages: Awaited<ReturnType<typeof gscQuery>> = [];
  let errMsg: string | null = null;

  try {
    const [t, q, p] = await Promise.all([
      gscQuery({ startDate, endDate, dimensions: [], rowLimit: 1 }),
      gscQuery({ startDate, endDate, dimensions: ['query'], rowLimit: 100 }),
      gscQuery({ startDate, endDate, dimensions: ['page'], rowLimit: 100 }),
    ]);
    totals = t[0]
      ? {
          clicks: t[0].clicks,
          impressions: t[0].impressions,
          ctr: t[0].ctr,
          position: t[0].position,
        }
      : { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    queries = q;
    pages = p;
  } catch (err) {
    errMsg = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Search Console</h1>
          <p className={styles.range}>
            Last {RANGE_DAYS} days &middot; {startDate} → {endDate}
          </p>
        </div>
        <Link href="/admin" className={styles.back}>
          ← Back to admin
        </Link>
      </header>

      {justConnected && (
        <section className={styles.successBanner}>Connected to Google ✓</section>
      )}

      {errMsg && (
        <section className={styles.error}>
          <h2>Couldn&apos;t load stats</h2>
          <pre>{errMsg}</pre>
          <p>
            If the error mentions <code>invalid_grant</code> the refresh token has
            expired —{' '}
            <a href="/admin-stats/auth/connect">re-connect</a>.
          </p>
        </section>
      )}

      {totals && (
        <section className={styles.totals}>
          <div className={styles.totalCard}>
            <p className={styles.totalLabel}>Clicks</p>
            <p className={styles.totalValue}>{fmtNumber(totals.clicks)}</p>
          </div>
          <div className={styles.totalCard}>
            <p className={styles.totalLabel}>Impressions</p>
            <p className={styles.totalValue}>{fmtNumber(totals.impressions)}</p>
          </div>
          <div className={styles.totalCard}>
            <p className={styles.totalLabel}>CTR</p>
            <p className={styles.totalValue}>{pct(totals.ctr)}</p>
          </div>
          <div className={styles.totalCard}>
            <p className={styles.totalLabel}>Avg position</p>
            <p className={styles.totalValue}>{fmtPosition(totals.position)}</p>
          </div>
        </section>
      )}

      {queries.length > 0 && (
        <section className={styles.tableSection}>
          <h2>Top queries</h2>
          <p className={styles.tableNote}>
            Top {queries.length} queries by clicks. Google withholds rare
            queries for user privacy — those clicks count in the totals
            above but don&apos;t appear here.
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Query</th>
                <th className={styles.num}>Clicks</th>
                <th className={styles.num}>Impr.</th>
                <th className={styles.num}>CTR</th>
                <th className={styles.num}>Position</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((row) => (
                <tr key={row.keys?.join('|')}>
                  <td>{row.keys?.[0] ?? '—'}</td>
                  <td className={styles.num}>{fmtNumber(row.clicks)}</td>
                  <td className={styles.num}>{fmtNumber(row.impressions)}</td>
                  <td className={styles.num}>{pct(row.ctr)}</td>
                  <td className={styles.num}>{fmtPosition(row.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {pages.length > 0 && (
        <section className={styles.tableSection}>
          <h2>Top pages</h2>
          <p className={styles.tableNote}>
            Top {pages.length} pages by clicks.
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Page</th>
                <th className={styles.num}>Clicks</th>
                <th className={styles.num}>Impr.</th>
                <th className={styles.num}>CTR</th>
                <th className={styles.num}>Position</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((row) => {
                const url = row.keys?.[0] ?? '';
                let display = url;
                try {
                  display = new URL(url).pathname || url;
                } catch {
                  /* ignore */
                }
                return (
                  <tr key={url}>
                    <td>
                      <a href={url} target="_blank" rel="noopener">
                        {display}
                      </a>
                    </td>
                    <td className={styles.num}>{fmtNumber(row.clicks)}</td>
                    <td className={styles.num}>{fmtNumber(row.impressions)}</td>
                    <td className={styles.num}>{pct(row.ctr)}</td>
                    <td className={styles.num}>{fmtPosition(row.position)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
