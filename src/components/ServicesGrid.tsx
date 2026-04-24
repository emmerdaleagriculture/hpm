import Image from 'next/image';
import Link from 'next/link';
import { mediaUrl } from '@/lib/media';
import styles from './ServicesGrid.module.css';

type ServiceDoc = {
  id: string | number;
  title: string;
  slug: string;
  homepageTagline?: string | null;
  heroImage?: Parameters<typeof mediaUrl>[0];
};

type Props = {
  services: ServiceDoc[];
};

/**
 * The featured-services asymmetric grid: first service renders as the large
 * feature tile (2fr col, spans 2 rows), the next 4 as smaller 1fr tiles.
 * The order the docs arrive in from Payload determines tile position.
 */
export function ServicesGrid({ services }: Props) {
  const [feature, ...rest] = services;

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div className={styles.eyebrow}>Services</div>
        <h2 className={styles.title}>What we do for your land.</h2>
        <Link href="/services" className={styles.link}>
          View all services →
        </Link>
      </div>

      <div className={styles.grid}>
        {feature && <ServiceTile service={feature} feature />}
        {rest.slice(0, 4).map((s) => (
          <ServiceTile key={s.id} service={s} />
        ))}
      </div>
    </section>
  );
}

function ServiceTile({ service, feature }: { service: ServiceDoc; feature?: boolean }) {
  const url = mediaUrl(service.heroImage, feature ? 'feature' : 'card');
  const altText =
    (typeof service.heroImage === 'object' && service.heroImage?.alt) ||
    service.title;
  const tileClass = `${styles.tile} ${feature ? styles.feature : ''}`.trim();

  return (
    <Link href={`/${service.slug}`} className={tileClass}>
      <div className={styles.photo}>
        {url && (
          <Image
            src={url}
            alt={altText}
            fill
            sizes={feature ? '(max-width: 900px) 100vw, 66vw' : '(max-width: 900px) 50vw, 22vw'}
            style={{ objectFit: 'cover' }}
          />
        )}
      </div>
      <div className={styles.overlay} />
      <div className={styles.meta}>
        {service.homepageTagline && <div className={styles.tag}>{service.homepageTagline}</div>}
        <div className={styles.name}>{service.title}</div>
        {feature && (
          <div className={styles.price}>Grass tyres · same-week bookings</div>
        )}
      </div>
    </Link>
  );
}
