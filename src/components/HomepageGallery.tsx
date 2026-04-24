import Image from 'next/image';
import Link from 'next/link';
import { mediaUrl } from '@/lib/media';
import styles from './HomepageGallery.module.css';

type MediaDoc = Parameters<typeof mediaUrl>[0];

type Props = {
  images: MediaDoc[];
};

export function HomepageGallery({ images }: Props) {
  return (
    <section className={styles.gallery}>
      <div className={styles.head}>
        <div className={styles.eyebrow}>Our company</div>
        <h2 className={styles.title}>Hampshire Paddock Management in pictures.</h2>
        <Link href="/gallery" className={styles.link}>
          Full gallery →
        </Link>
      </div>

      <div className={styles.grid}>
        {images.map((media, i) => {
          const url = mediaUrl(media, 'card');
          const alt =
            (typeof media === 'object' && media?.alt) ||
            'Hampshire Paddock Management at work';
          return (
            <div key={i} className={styles.tile}>
              {url && (
                <Image
                  src={url}
                  alt={alt}
                  fill
                  sizes="(max-width: 900px) 50vw, 25vw"
                  style={{ objectFit: 'cover' }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.foot}>
        <Link href="/gallery">See the full gallery →</Link>
      </div>
    </section>
  );
}
