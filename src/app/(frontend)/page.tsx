import type { Metadata } from 'next';
import { getPayload } from 'payload';
import config from '@payload-config';
import { Hero } from '@/components/Hero';
import { PhoneStrip } from '@/components/PhoneStrip';
import { StatBand } from '@/components/StatBand';
import { Intro } from '@/components/Intro';
import { ServicesGrid } from '@/components/ServicesGrid';
import { HomepageGallery } from '@/components/HomepageGallery';
import { FleetSection } from '@/components/FleetSection';
import { CtaBlock } from '@/components/CtaBlock';
import { Footer } from '@/components/Footer';

// Re-read on every request in dev; ISR-like caching in production will be
// added at build time. The admin expects saves to be visible without a rebuild.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  // Use the layout default title (no template wrap on the homepage)
  title: 'Hampshire Paddock Management — Proper care for your land',
  description:
    'Specialist paddock work across Hampshire and surrounding counties. Topping, harrowing, weed control, drainage, more. Modern compact kit. The person you call is the person on the tractor.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const payload = await getPayload({ config });

  // Homepage global — carries the hero background image
  const homepage = await payload.findGlobal({ slug: 'homepage', depth: 1 });

  // Featured services — the 5 tiles
  const featured = await payload.find({
    collection: 'services',
    where: { featuredOnHomepage: { equals: true } },
    sort: 'orderInMenu',
    depth: 1,
    limit: 5,
  });

  // Gallery — 12 flagged images
  const gallery = await payload.find({
    collection: 'media',
    where: { showOnHomepageGallery: { equals: true } },
    limit: 12,
    depth: 0,
  });

  // Fleet photo — reuse the homepage hero for now; swap when a dedicated
  // fleet shot is available
  const fleetPhoto = homepage.hero?.backgroundImage;

  return (
    <>
      <Hero backgroundImage={homepage.hero?.backgroundImage} />
      <PhoneStrip />
      <StatBand />
      <Intro />
      <ServicesGrid
        services={featured.docs.map((s) => ({
          id: s.id,
          title: s.title,
          slug: s.slug,
          homepageTagline: s.homepageTagline,
          heroImage: s.heroImage,
        }))}
      />
      <HomepageGallery images={gallery.docs} />
      <FleetSection photo={fleetPhoto} />
      <CtaBlock />
      <Footer />
    </>
  );
}
