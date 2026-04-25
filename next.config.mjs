import { withPayload } from '@payloadcms/next/withPayload';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // React 19 strict mode — catches accidental side-effects
  reactStrictMode: true,

  // Let middleware handle trailing-slash redirects so legacy WP URLs
  // (/paddock-topping/ → /services/paddock-topping) resolve in a single
  // 301 instead of a 308 → 301 chain.
  skipTrailingSlashRedirect: true,

  // Image optimisation: allow Supabase storage as an approved remote host
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'unakyuksioglmihvipmi.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'unakyuksioglmihvipmi.storage.supabase.co',
        pathname: '/**',
      },
    ],
    // Modern formats — Next will serve AVIF/WebP to browsers that support them
    formats: ['image/avif', 'image/webp'],
    // Trimmed responsive widths — every entry here multiplies how many
    // optimisations next/image queues per page. With ~15 service tiles
    // each fanning out a srcset, the previous 7+8 entries hit 130+
    // concurrent Sharp jobs and saturated the dev optimizer (504s).
    deviceSizes: [640, 1080, 1920],
    imageSizes: [256, 640],
  },

  // /quote serves the contact page without a redirect — both URLs are
  // first-class CTA targets and we want the URL the user typed to stick.
  async rewrites() {
    return [
      { source: '/quote', destination: '/contact' },
    ];
  },

  // Permanent redirects for legacy WordPress URL patterns.
  // See `audit-slugs-report.md` (regenerate with scripts/audit-slugs.mjs).
  async redirects() {
    return [
      // Services renamed during the rebuild
      { source: '/services/dung-sweeping',       destination: '/services/manure-sweeping',       permanent: true },
      { source: '/services/fertiliser-spraying', destination: '/services/fertiliser-application', permanent: true },
      { source: '/services/field-harrowing',     destination: '/services/harrowing',              permanent: true },
      { source: '/services/field-rotavating',    destination: '/services/rotavating',             permanent: true },
      { source: '/services/paddock-rolling',     destination: '/services/rolling',                permanent: true },
      { source: '/services/ragwort-pulling',     destination: '/services/weed-control',           permanent: true },
      // /services/seedsight intentionally NOT redirected — the seedsight
      // service still has a live DB record. Delete the record first if
      // we want this redirect to fire.
      // /services/field-ploughing and /services/hedge-cutting:
      // pending Tom's call (see audit report). Add lines here when decided.

      // Blog → Notes
      { source: '/blog',       destination: '/notes',        permanent: true },
      { source: '/blog/:slug', destination: '/notes/:slug',  permanent: true },

      // WooCommerce artefacts
      { source: '/shop',              destination: '/', permanent: true },
      { source: '/shop/:path*',       destination: '/', permanent: true },
      { source: '/cart',              destination: '/', permanent: true },
      { source: '/checkout',          destination: '/', permanent: true },
      { source: '/my-account',        destination: '/', permanent: true },
      { source: '/my-account/:path*', destination: '/', permanent: true },
      { source: '/wishlist',          destination: '/', permanent: true },
      { source: '/products-compare',  destination: '/', permanent: true },

      // Other old WP paths
      { source: '/tools',  destination: '/#fleet',   permanent: true },
      { source: '/costs',  destination: '/services', permanent: true },
      { source: '/videos', destination: '/notes',    permanent: true },

      // /privacy-policy was the WP slug; new site uses /privacy.
      { source: '/privacy-policy', destination: '/privacy', permanent: true },
    ];
  },

  // Security headers applied to every response
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Don't allow this site to be iframed except by itself
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // MIME sniffing protection
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer policy — balanced between privacy and analytics
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Opt in to modern permission controls
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },

  // Payload admin runs on /admin and uses a few experimental Next features
  experimental: {
    // Required for Payload
    reactCompiler: false,
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
