import { withPayload } from '@payloadcms/next/withPayload';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // React 19 strict mode — catches accidental side-effects
  reactStrictMode: true,

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
    // Sensible default sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
