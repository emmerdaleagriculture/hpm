import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { getPayload } from 'payload';
import config from '@payload-config';

import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { PricingPageView } from '@/components/pricing/PricingPageView';
import { mediaUrl } from '@/lib/media';
import type { PricingPageData } from '@/lib/pricing-types';

/**
 * /pricing — Hampshire Paddock Management pricing page.
 *
 * Pulls editable content from the `pricing-page` Payload global, and a
 * cover photo + side-rail photos from the Media collection. Photos are
 * the latest non-hidden gallery images, so /gallery's hide flag carries
 * through here automatically.
 */
export const revalidate = 3600;

const PRICING_HERO_ID = 39; // Burcombe Estate Vinery — same default as /gallery

const getPricingPageData = unstable_cache(
  async () => {
    const payload = await getPayload({ config });
    const data = (await payload.findGlobal({
      slug: 'pricing-page',
      depth: 0,
    })) as unknown as PricingPageData;

    let heroMedia: Parameters<typeof mediaUrl>[0] = null;
    try {
      heroMedia = await payload.findByID({
        collection: 'media',
        id: PRICING_HERO_ID,
        depth: 0,
      });
    } catch {
      heroMedia = null;
    }

    const rail = await payload.find({
      collection: 'media',
      where: {
        mimeType: { contains: 'image/' },
        or: [
          { hideFromGallery: { equals: false } },
          { hideFromGallery: { exists: false } },
        ],
      },
      sort: '-createdAt',
      limit: 8,
      depth: 0,
    });

    return { data, heroMedia, railPhotos: rail.docs };
  },
  ['pricing-page-data'],
  { revalidate: 300, tags: ['media', 'pricing-page'] },
);

export async function generateMetadata(): Promise<Metadata> {
  const { data } = await getPricingPageData();
  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: { canonical: '/pricing' },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      type: 'website',
      url: '/pricing',
    },
  };
}

export default async function PricingPage() {
  const { data, heroMedia, railPhotos } = await getPricingPageData();
  const heroUrl = mediaUrl(heroMedia, 'hero') ?? mediaUrl(heroMedia);
  const heroAlt =
    (typeof heroMedia === 'object' && heroMedia?.alt) || 'Hampshire paddock work';

  const railUrls = railPhotos
    .map((m) => ({
      url: mediaUrl(m, 'card') ?? mediaUrl(m),
      alt: m.alt ?? '',
      id: m.id,
    }))
    .filter((p): p is { url: string; alt: string; id: number } => Boolean(p.url));

  return (
    <>
      <Nav variant="overlay" />
      <PricingPageView
        data={data}
        heroUrl={heroUrl}
        heroAlt={heroAlt}
        railPhotos={railUrls}
      />
      <Footer />
    </>
  );
}
