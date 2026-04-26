import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'

import { PricingPageView } from '@/components/pricing/PricingPageView'
import type { PricingPageData } from '@/lib/pricing-types'

/**
 * /pricing — Hampshire Paddock Management pricing page.
 *
 * Renders content from the `pricing-page` Payload global so non-developers
 * can edit copy, services, factors, and CTAs from the admin panel.
 *
 * Revalidate every hour. Edits in admin will reflect within that window
 * (or you can wire up an afterChange hook to revalidate on save).
 */
export const revalidate = 3600

async function getPricingPage(): Promise<PricingPageData> {
  const payload = await getPayload({ config })
  const data = await payload.findGlobal({
    slug: 'pricing-page',
    depth: 0,
  })
  return data as unknown as PricingPageData
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPricingPage()
  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: {
      canonical: '/pricing',
    },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      type: 'website',
      url: '/pricing',
    },
  }
}

export default async function PricingPage() {
  const data = await getPricingPage()
  return <PricingPageView data={data} />
}
