import Image from 'next/image';
import Link from 'next/link';
import { Nav } from './Nav';
import { mediaUrl } from '@/lib/media';
import styles from './Hero.module.css';

type HeroMedia = Parameters<typeof mediaUrl>[0];

type Props = {
  backgroundImage?: HeroMedia;
};

export function Hero({ backgroundImage }: Props) {
  const url = mediaUrl(backgroundImage, 'hero') ?? mediaUrl(backgroundImage);
  const alt =
    (typeof backgroundImage === 'object' && backgroundImage?.alt) ||
    'John Deere tractor at work in a Hampshire paddock';

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
        <div className={styles.eyebrow}>Hampshire · equine · agricultural</div>
        <h1 className={styles.headline}>
          Paddock care, done <em>properly.</em>
        </h1>
        <p className={styles.sub}>
          Modern compact machinery. Proper agronomy. The Hampshire fleet with the
          reach of an agricultural main dealer behind it.
        </p>
        <div className={styles.actions}>
          <Link href="/contact" className={styles.btnYellow}>
            Get a free quote →
          </Link>
          <Link href="/services" className={styles.btnGhost}>
            Browse services
          </Link>
        </div>
      </div>
    </section>
  );
}
