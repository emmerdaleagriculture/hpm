import type { Metadata } from 'next';
import Link from 'next/link';

import { adminStatsGuard } from '@/components/admin-stats/guard';
import { SubNav } from '@/components/admin-stats/SubNav';
import styles from '../admin-stats.module.css';
import planStyles from './plan.module.css';

export const metadata: Metadata = {
  title: 'Plan — HPM Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * /admin-stats/plan — what's queued.
 *
 * Three sections:
 *   1. Active scheduled remote agents (Anthropic routines).
 *   2. Deferred SEO improvements called out in recent PRs.
 *   3. Recurring tasks Tom should remember.
 *
 * Content is hardcoded — these are tracked in PR descriptions and
 * the Anthropic routines API rather than in this app's database.
 * When the list grows or an agent runs, edit this file (or add
 * the URLs as a Payload global later).
 */

type ScheduledRoutine = {
  name: string;
  fires: string;
  description: string;
  manageUrl: string;
};

type Followup = {
  title: string;
  why: string;
  status: 'open' | 'in-progress' | 'done';
  prRef?: string;
};

type Recurring = {
  cadence: string;
  task: string;
  detail: string;
};

const ROUTINES: ScheduledRoutine[] = [
  {
    name: 'Vercel env vars reminder for /admin-stats',
    fires: '2026-05-10 09:00 UTC (one-shot)',
    description:
      "Curls hampshirepaddockmanagement.com, checks for `x-vercel-id`. If the site is on Vercel by then, opens a GitHub issue listing the four env vars to set (without including the secret values). If still not deployed, exits quietly.",
    manageUrl: 'https://claude.ai/code/routines/trig_01XgeSCYt4AiL4tF3H5ie6jE',
  },
];

const FOLLOWUPS: Followup[] = [
  {
    title: '/paddock-maintenance pillar page',
    why: '"paddock maintenance" was 303 imp / pos 19.8 (page 2) on the first audit. Pillar page targets the keyword + drives 20+ internal links into service pages.',
    status: 'done',
    prRef: '#27',
  },
  {
    title: 'Internal linking pass for orphan queries',
    why: '"rotavated soil", "poor aeration", "horse paddock drainage" — all 18-56 imp at positions 4-7 with zero clicks. Added contextual cross-links from 5 service pages (overseeding, spraying, rolling, manure-sweeping, rotavating) using the orphan phrase as anchor text. See scripts/seo-orphan-internal-links.mjs.',
    status: 'done',
    prRef: '#25 deferred list',
  },
  {
    title: 'Service schema.org markup',
    why: 'No `Service` JSON-LD on /services/* pages yet. The new /paddock-maintenance has it; the 15 service detail pages should each emit a Service block too — eligible for rich snippets in SERP.',
    status: 'open',
    prRef: '#25 deferred list',
  },
  {
    title: 'GitHub auto-deploy via Vercel app',
    why: 'Vercel project `tomforex1s-projects/hpm-site` is linked but the GitHub-app connection to `emmerdaleagriculture/hpm` failed at link time (cross-org permissions). Currently every deploy is manual `vercel --prod`. To enable on-push deploys: install the Vercel GitHub App on the emmerdaleagriculture org and re-run `vercel link`.',
    status: 'open',
  },
  {
    title: 'Connect to Google on prod (post-OAuth-scope-change)',
    why: 'OAuth scope was extended for GA4. Prod token re-granted with the wider scope on 2026-04-26.',
    status: 'done',
  },
  {
    title: 'Set Vercel env vars after DNS swap to hampshirepaddockmanagement.com',
    why: "When the live domain points at Vercel, NEXT_PUBLIC_SITE_URL must change from the .vercel.app URL to the real domain, and a fresh OAuth redirect URI added. The 2026-05-10 routine will open a tracking issue when it detects the swap.",
    status: 'open',
  },
];

const RECURRING: Recurring[] = [
  {
    cadence: 'Weekly',
    task: 'Open /admin-stats/overview',
    detail: 'Check the period-over-period delta. Sustained drop on clicks or impressions = something broke.',
  },
  {
    cadence: 'Monthly',
    task: 'Run scripts/seo-audit.mjs',
    detail:
      "DATABASE_URL=$DATABASE_URL_PROD npx tsx scripts/seo-audit.mjs — pulls 90d totals, top queries, almost-there list, CTR opportunities. Look for new high-impression-low-CTR queries and rewrite the relevant page's seo.metaTitle / metaDescription in the admin.",
  },
  {
    cadence: 'Monthly',
    task: 'Triage queries in the Queries → Almost there report',
    detail:
      'Positions 4–10 with high impressions are where small content/title wins matter most. If a query is consistently ranking 4-10 with low CTR, the title or meta description on the destination page needs tightening.',
  },
  {
    cadence: 'Quarterly',
    task: 'Re-crawl with Screaming Frog',
    detail:
      'Run scripts/check-redirects.sh against prod first to confirm the redirect map still resolves. Then a full Screaming Frog crawl, diffed against the previous one with scripts/crawl-diff.py.',
  },
  {
    cadence: 'On every new post / service',
    task: 'Fill in the SEO tab',
    detail: 'metaTitle (≤60 chars, include locality + benefit) and metaDescription (≤155 chars). Empty SEO tab = page falls back to brand-only title which converts poorly.',
  },
];

function StatusPill({ status }: { status: Followup['status'] }) {
  const map: Record<Followup['status'], string> = {
    open: planStyles.pillOpen,
    'in-progress': planStyles.pillProgress,
    done: planStyles.pillDone,
  };
  return <span className={`${planStyles.pill} ${map[status]}`}>{status}</span>;
}

export default async function PlanPage() {
  const { block } = await adminStatsGuard('/admin-stats/plan');
  if (block) return block;

  return (
    <main className={styles.page}>
      <SubNav active="/admin-stats/plan" />
      <header className={styles.head}>
        <div>
          <h1>Plan</h1>
          <p className={styles.range}>
            Scheduled agents, deferred follow-ups, recurring tasks
          </p>
        </div>
      </header>

      <section className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2>Scheduled remote agents</h2>
          <a
            href="https://claude.ai/code/routines"
            target="_blank"
            rel="noopener noreferrer"
          >
            Manage all on claude.ai ↗
          </a>
        </div>
        <p className={styles.tableNote}>
          Background jobs running on Anthropic&apos;s infra. They have their own
          OAuth/auth and don&apos;t see local state, so most live work is in their
          one-shot prompt.
        </p>
        {ROUTINES.length === 0 ? (
          <p className={styles.muted}>None scheduled.</p>
        ) : (
          <ul className={planStyles.routineList}>
            {ROUTINES.map((r) => (
              <li key={r.name} className={planStyles.routineCard}>
                <div className={planStyles.routineHead}>
                  <strong>{r.name}</strong>
                  <a
                    href={r.manageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={planStyles.routineLink}
                  >
                    open ↗
                  </a>
                </div>
                <p className={planStyles.routineFires}>Fires: {r.fires}</p>
                <p className={planStyles.routineDesc}>{r.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2>Deferred follow-ups</h2>
        </div>
        <p className={styles.tableNote}>
          Items called out in recent PRs but not shipped yet, plus completed
          ones for the trail. When you complete one, edit{' '}
          <code>src/app/admin-stats/plan/page.tsx</code> to mark it done — or
          delete the entry once the trail isn&apos;t useful any more.
        </p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Item</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {FOLLOWUPS.map((f) => (
              <tr key={f.title}>
                <td><StatusPill status={f.status} /></td>
                <td>
                  <strong className={planStyles.followupTitle}>{f.title}</strong>
                  <p className={planStyles.followupWhy}>{f.why}</p>
                </td>
                <td className={planStyles.followupRef}>{f.prRef ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2>Recurring tasks</h2>
        </div>
        <p className={styles.tableNote}>
          Things to do on a cadence rather than once. None of these are
          automated yet — paste them into a calendar or run them manually.
        </p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Cadence</th>
              <th>Task</th>
            </tr>
          </thead>
          <tbody>
            {RECURRING.map((r) => (
              <tr key={`${r.cadence}-${r.task}`}>
                <td className={planStyles.cadence}>{r.cadence}</td>
                <td>
                  <strong className={planStyles.followupTitle}>{r.task}</strong>
                  <p className={planStyles.followupWhy}>{r.detail}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2>Quick links</h2>
        </div>
        <ul className={planStyles.quickLinks}>
          <li><a href="https://claude.ai/code/routines" target="_blank" rel="noopener noreferrer">claude.ai routines (manage scheduled agents) ↗</a></li>
          <li><a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Google Search Console ↗</a></li>
          <li><a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">Google Analytics 4 ↗</a></li>
          <li><a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">Vercel dashboard ↗</a></li>
          <li><Link href="/admin-stats/queries">Queries → Almost there report</Link></li>
        </ul>
      </section>
    </main>
  );
}
