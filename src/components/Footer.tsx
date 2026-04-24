import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { getPayload } from 'payload';
import config from '@payload-config';
import { SERVICE_CATEGORIES } from '@/lib/services';
import styles from './Footer.module.css';

type ServiceLink = { slug: string; title: string; category: string };

// Cache the grouped-services lookup — every page renders the footer, and the
// list rarely changes. Revalidate every 5 minutes; admin saves don't need to
// be reflected in the footer instantly.
const getGroupedServices = unstable_cache(
  async (): Promise<Record<string, ServiceLink[]>> => {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: 'services',
      sort: 'orderInMenu',
      limit: 100,
      depth: 0,
      where: { category: { exists: true } },
    });
    const byCat: Record<string, ServiceLink[]> = {};
    for (const s of res.docs) {
      if (!s.category) continue;
      (byCat[s.category] ??= []).push({ slug: s.slug, title: s.title, category: s.category });
    }
    return byCat;
  },
  ['footer-grouped-services'],
  { revalidate: 300, tags: ['services'] },
);

export async function Footer() {
  const year = new Date().getFullYear();
  const byCat = await getGroupedServices();

  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        <div>
          <div className={styles.brand}>Hampshire Paddock Management</div>
          <p className={styles.desc}>
            Modern paddock &amp; smallholding management for horse owners and
            landowners across Hampshire and the surrounding counties.
          </p>
        </div>

        {SERVICE_CATEGORIES.map((cat) => (
          <div key={cat.key} className={styles.col}>
            <h4>{cat.label}</h4>
            <ul>
              {(byCat[cat.key] ?? []).map((s) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`}>{s.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className={styles.col}>
          <h4>Contact</h4>
          <ul>
            <li><a href="tel:07825156062">07825 156062</a></li>
            <li><a href="mailto:tom@hampshirepaddockmanagement.com">tom@hampshirepaddockmanagement.com</a></li>
            <li style={{ marginTop: 10 }}>Hampshire, United Kingdom</li>
            <li style={{ marginTop: 16 }}>
              <Link href="/services">All services</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>© {year} Emmerdale Agriculture Ltd · Company No. 14950816</span>
        <nav className={styles.bottomLinks} aria-label="Legal">
          <Link href="/privacy">Privacy policy</Link>
        </nav>
        <span>Made with care in Hampshire</span>
      </div>
    </footer>
  );
}
