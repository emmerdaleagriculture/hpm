import type { Metadata } from 'next';
import Image from 'next/image';
import { unstable_cache } from 'next/cache';
import { getPayload } from 'payload';
import config from '@payload-config';

import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Gallery } from '@/components/Gallery';
import { mediaUrl } from '@/lib/media';
import styles from './gallery.module.css';

export const metadata: Metadata = {
  title: 'Gallery — Hampshire Paddock Management',
  description:
    'Photos of the Hampshire Paddock Management fleet and paddock work across Hampshire, Wiltshire, Berkshire, Surrey, Dorset and East Sussex.',
};

// Hardcoded gallery hero — real photo from the imports (id=39 Burcombe
// Estate Vinery paddock management). Swap in admin later if needed.
const GALLERY_HERO_ID = 39;

const getGalleryData = unstable_cache(
  async () => {
    const payload = await getPayload({ config });

    const res = await payload.find({
      collection: 'media',
      // `contains` is substring-matching on a single string; avoids `like`'s
      // whitespace-tokenising quirk. Matches image/jpeg, image/png, image/webp,
      // image/gif, image/svg+xml, etc., and excludes application/pdf + video/*.
      where: {
        mimeType: { contains: 'image/' },
      },
      sort: '-createdAt',
      limit: 0,
      depth: 0,
    });

    let heroMedia: Parameters<typeof mediaUrl>[0] = null;
    try {
      heroMedia = await payload.findByID({
        collection: 'media',
        id: GALLERY_HERO_ID,
        depth: 0,
      });
    } catch {
      heroMedia = res.docs[0] ?? null;
    }

    return { photos: res.docs, heroMedia };
  },
  ['gallery-data'],
  { revalidate: 300, tags: ['media'] },
);

export default async function GalleryPage() {
  const { photos, heroMedia } = await getGalleryData();
  const heroUrl = mediaUrl(heroMedia, 'hero') ?? mediaUrl(heroMedia);

  return (
    <>
      <section className={styles.hero}>
        <Nav variant="overlay" />
        <div className={styles.heroPhoto}>
          {heroUrl && (
            <Image
              src={heroUrl}
              alt={(typeof heroMedia === 'object' && heroMedia?.alt) || 'Paddock work in Hampshire'}
              fill
              priority
              sizes="100vw"
              style={{ objectFit: 'cover' }}
            />
          )}
          <div className={styles.heroGradient} />
        </div>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>Gallery</div>
          <h1 className={styles.title}>
            The kit, and the <em>work</em>
          </h1>
          <p className={styles.sub}>
            Machines we run and paddocks we&apos;ve put right. All shot on site.
          </p>
        </div>
      </section>

      <section className={styles.wrap}>
        <Gallery photos={photos} />
      </section>

      <Footer />
    </>
  );
}
