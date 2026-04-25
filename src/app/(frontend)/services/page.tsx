import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@payload-config';

import { Nav } from '@/components/Nav';
import { PhoneStrip } from '@/components/PhoneStrip';
import { Footer } from '@/components/Footer';
import { CtaBlock } from '@/components/CtaBlock';
import { mediaUrl } from '@/lib/media';
import { SERVICE_CATEGORIES } from '@/lib/services';
import styles from './services.module.css';

export const metadata: Metadata = {
  title: 'Services — Hampshire Paddock Management',
  description:
    'Cutting, ground care, and treatment & upkeep services for paddocks and smallholdings across Hampshire, Wiltshire, Berkshire, Surrey, Dorset and East Sussex.',
};

export const dynamic = 'force-dynamic';

type ServiceDoc = {
  id: string | number;
  title: string;
  slug: string;
  shortDescription?: string | null;
  homepageTagline?: string | null;
  category?: string | null;
  heroImage?: Parameters<typeof mediaUrl>[0];
};

export default async function ServicesIndexPage() {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'services',
    sort: 'orderInMenu',
    limit: 100,
    depth: 1,
    where: { category: { exists: true } },
  });

  const byCategory: Record<string, ServiceDoc[]> = {};
  for (const doc of res.docs as unknown as ServiceDoc[]) {
    if (!doc.category) continue;
    (byCategory[doc.category] ??= []).push(doc);
  }

  return (
    <>
      <section className={styles.hero}>
        <Nav variant="overlay" />
        <div className={styles.heroContent}>
          <div className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span className={styles.sep}>/</span>
            <span className={styles.current}>Services</span>
          </div>
          <h1 className={styles.title}>Services.</h1>
          <p className={styles.strapline}>
            Cutting &amp; mowing, ground care, treatment &amp; upkeep — across
            Hampshire and the surrounding counties.
          </p>
        </div>
      </section>
      <PhoneStrip />

      <div className={styles.sections}>
        {SERVICE_CATEGORIES.map((cat) => {
          const items = byCategory[cat.key] ?? [];
          if (items.length === 0) return null;
          return (
            <section key={cat.key} className={styles.catSection}>
              <div className={styles.catHead}>
                <div className={styles.eyebrow}>— {cat.label}</div>
              </div>
              <div className={styles.grid}>
                {items.map((s) => (
                  <ServiceCard key={s.id} service={s} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <CtaBlock />
      <Footer />
    </>
  );
}

function ServiceCard({ service }: { service: ServiceDoc }) {
  // 'large' variant first, fall back to original; see ServicesGrid.
  const url =
    mediaUrl(service.heroImage, 'large') ?? mediaUrl(service.heroImage);
  const alt =
    (typeof service.heroImage === 'object' && service.heroImage?.alt) ||
    service.title;
  return (
    <Link href={`/services/${service.slug}`} className={styles.tile}>
      <div className={styles.photo}>
        {url && (
          <Image
            src={url}
            alt={alt}
            fill
            sizes="(max-width: 900px) 100vw, 33vw"
            style={{ objectFit: 'contain' }}
          />
        )}
      </div>
      <div className={styles.overlay} />
      <div className={styles.meta}>
        {service.homepageTagline && <div className={styles.tag}>{service.homepageTagline}</div>}
        <div className={styles.name}>{service.title}</div>
        {service.shortDescription && (
          <div className={styles.desc}>{service.shortDescription}</div>
        )}
      </div>
    </Link>
  );
}
