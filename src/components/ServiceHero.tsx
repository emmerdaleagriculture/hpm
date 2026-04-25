import Image from 'next/image';
import Link from 'next/link';
import { Nav } from './Nav';
import { mediaUrl } from '@/lib/media';
import styles from './ServiceHero.module.css';

type HeroMedia = Parameters<typeof mediaUrl>[0];

type Props = {
  title: string;
  /** HTML-trusted strapline — supports <em> for italic fragments. */
  strapline?: string | null;
  heroImage?: HeroMedia;
};

export function ServiceHero({ title, strapline, heroImage }: Props) {
  // Prefer the 'large' variant (width 2000, no crop) over the original —
  // serving a 6+MP raw file through next/image's optimizer in dev causes
  // timeouts. Older media without the variant falls back to the original.
  const url = mediaUrl(heroImage, 'large') ?? mediaUrl(heroImage);
  const alt =
    (typeof heroImage === 'object' && heroImage?.alt) || title;

  return (
    <section className={styles.hero}>
      <Nav variant="overlay" />

      <div className={styles.photo}>
        {url && (
          <Image
            src={url}
            alt={alt}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover' }}
          />
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span className={styles.sep}>/</span>
          <Link href="/services">Services</Link>
          <span className={styles.sep}>/</span>
          <span className={styles.current}>{title}</span>
        </div>
        <h1 className={styles.title}>{title}.</h1>
        {strapline && (
          <p
            className={styles.strapline}
            /* The strapline may include <em> emphasis as authored in admin */
            dangerouslySetInnerHTML={{ __html: strapline }}
          />
        )}
      </div>
    </section>
  );
}
