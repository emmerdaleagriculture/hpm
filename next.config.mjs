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
