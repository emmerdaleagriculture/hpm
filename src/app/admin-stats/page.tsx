import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@payload-config';

import { gscQuery, isoDaysAgo, isGscConfigured } from '@/lib/gsc';
import styles from './admin-stats.module.css';

export const metadata: Metadata = {
  title: 'Search Console — HPM Admin',
  robots: { index: false, follow: false },
};

// Fresh on every request — no caching of admin-only data.
export const dynamic = 'force-dynamic';

const RANGE_DAYS = 28;
const GSC_LAG_DAYS = 3; // GSC data has a 2-3 day lag

function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

function fmtNumber(n: number) {
  return n.toLocaleString('en-GB');
}

function fmtPosition(n: number) {
  return n.toFixed(1);
}

export default async function AdminStatsPage() {
  // Auth — Payload returns user=null if no/invalid cookie.
  const payload = await getPayload({ config });
  const h = await headers();
  const { user } = await payload.auth({ headers: h });
  if (!user) redirect('/admin/login?redirect=/admin-stats');

  if (!isGscConfigured()) {
    return (
      <main className={styles.page}>
        <header className={styles.head}>
          <h1>Search Console</h1>
          <Link href="/admin" className={styles.back}>
            ← Back to admin
          </Link>
        </header>
        <section className={styles.notConfigured}>
          <h2>Not configured yet</h2>
          <p>Three env vars are required:</p>
          <ul>
            <li>
              <code>GSC_SERVICE_ACCOUNT_EMAIL</code>
            </li>
            <li>
              <code>GSC_SERVICE_ACCOUNT_PRIVATE_KEY</code>
            </li>
            <li>
              <code>GSC_SITE_URL</code> — e.g.{' '}
              <code>sc-domain:hampshirepaddockmanagement.com</code>
            </li>
          </ul>
          <p>
            And the service account must be added as a User on the GSC property at{' '}
            <a
              href="https://search.google.com/search-console/users"
              target="_blank"
              rel="noopener"
            >
              search.google.com/search-console/users
            </a>
            .
          </p>
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
      gscQuery({ startDate, endDate, dimensions: ['query'], rowLimit: 25 }),
      gscQuery({ startDate, endDate, dimensions: ['page'], rowLimit: 25 }),
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

      {errMsg && (
        <section className={styles.error}>
          <h2>Couldn&apos;t load stats</h2>
          <pre>{errMsg}</pre>
          <p>
            Most common cause: the service account hasn&apos;t been added to the GSC
            property as a User yet.
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
                  /* ignore parse failure, show raw */
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
