import type { Metadata } from 'next';

import { gscQuery, isoDaysAgo, type GscRow } from '@/lib/gsc';
import { adminStatsGuard } from '@/components/admin-stats/guard';
import { SubNav } from '@/components/admin-stats/SubNav';
import styles from '../admin-stats.module.css';

export const metadata: Metadata = {
  title: 'Segments — HPM Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const RANGE_DAYS = 28;
const GSC_LAG_DAYS = 3;

function fmtNumber(n: number) {
  return n.toLocaleString('en-GB');
}
function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}
function fmtPosition(n: number) {
  return n.toFixed(1);
}

const DEVICE_LABELS: Record<string, string> = {
  DESKTOP: 'Desktop',
  MOBILE: 'Mobile',
  TABLET: 'Tablet',
};

const COUNTRY_NAMES: Record<string, string> = {
  gbr: 'United Kingdom',
  usa: 'United States',
  irl: 'Ireland',
  fra: 'France',
  deu: 'Germany',
  esp: 'Spain',
  nld: 'Netherlands',
  bel: 'Belgium',
  ita: 'Italy',
  pol: 'Poland',
  aus: 'Australia',
  can: 'Canada',
};

function countryLabel(code: string) {
  return COUNTRY_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

function SegmentTable({
  title,
  rows,
  labelFn,
  totalClicks,
}: {
  title: string;
  rows: GscRow[];
  labelFn: (k: string) => string;
  totalClicks: number;
}) {
  if (rows.length === 0) {
    return (
      <section className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2>{title}</h2>
        </div>
        <p className={styles.muted}>No data.</p>
      </section>
    );
  }

  return (
    <section className={styles.tableSection}>
      <div className={styles.tableHeader}>
        <h2>{title}</h2>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Segment</th>
            <th className={styles.num}>Clicks</th>
            <th className={styles.num}>Share</th>
            <th className={styles.num}>Impr.</th>
            <th className={styles.num}>CTR</th>
            <th className={styles.num}>Position</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const k = r.keys?.[0] ?? '—';
            const share = totalClicks > 0 ? r.clicks / totalClicks : 0;
            return (
              <tr key={k}>
                <td>{labelFn(k)}</td>
                <td className={styles.num}>{fmtNumber(r.clicks)}</td>
                <td className={styles.num}>{pct(share)}</td>
                <td className={styles.num}>{fmtNumber(r.impressions)}</td>
                <td className={styles.num}>{pct(r.ctr)}</td>
                <td className={styles.num}>{fmtPosition(r.position)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export default async function SegmentsPage() {
  const { block } = await adminStatsGuard('/admin-stats/segments');
  if (block) return block;

  const endDate = isoDaysAgo(GSC_LAG_DAYS);
  const startDate = isoDaysAgo(GSC_LAG_DAYS + RANGE_DAYS);

  let devices: GscRow[] = [];
  let countries: GscRow[] = [];
  let appearances: GscRow[] = [];
  let totalClicks = 0;
  let errMsg: string | null = null;

  try {
    const [d, c, a, t] = await Promise.all([
      gscQuery({ startDate, endDate, dimensions: ['device'], rowLimit: 10 }),
      gscQuery({ startDate, endDate, dimensions: ['country'], rowLimit: 25 }),
      gscQuery({
        startDate,
        endDate,
        // searchAppearance is a special dimension — must be queried alone.
        dimensions: ['searchAppearance'],
        rowLimit: 25,
      }),
      gscQuery({ startDate, endDate, dimensions: [], rowLimit: 1 }),
    ]);
    devices = [...d].sort((a, b) => b.clicks - a.clicks);
    countries = [...c].sort((a, b) => b.clicks - a.clicks);
    appearances = [...a].sort((a, b) => b.clicks - a.clicks);
    totalClicks = t[0]?.clicks ?? 0;
  } catch (err) {
    errMsg = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className={styles.page}>
      <SubNav active="/admin-stats/segments" />
      <header className={styles.head}>
        <div>
          <h1>Segments</h1>
          <p className={styles.range}>
            Last {RANGE_DAYS} days &middot; {startDate} → {endDate}
          </p>
        </div>
      </header>

      {errMsg && (
        <section className={styles.error}>
          <h2>Couldn&apos;t load segments</h2>
          <pre>{errMsg}</pre>
        </section>
      )}

      <SegmentTable
        title="Device"
        rows={devices}
        labelFn={(k) => DEVICE_LABELS[k] ?? k}
        totalClicks={totalClicks}
      />

      <SegmentTable
        title="Country"
        rows={countries}
        labelFn={countryLabel}
        totalClicks={totalClicks}
      />

      <SegmentTable
        title="Search appearance"
        rows={appearances}
        labelFn={(k) => k}
        totalClicks={totalClicks}
      />
    </main>
  );
}
