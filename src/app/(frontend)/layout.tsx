import type { Metadata } from 'next';
import Script from 'next/script';
import { Tenor_Sans, DM_Sans } from 'next/font/google';
import './globals.css';

// Hampshire Green typography stack.
// Tenor Sans = display headings (gentle, editorial)
// DM Sans    = body (clean, reads well at small sizes)
const tenor = Tenor_Sans({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

const dm = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

// Default metadata — individual pages override as needed.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Hampshire Paddock Management — Proper care for your land',
    template: '%s | Hampshire Paddock Management',
  },
  description:
    'Paddock and small-holding management across Hampshire, Wiltshire, Berkshire, Surrey, Dorset and East Sussex. Compact machinery, grass tyres, no ruts.',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: 'Hampshire Paddock Management',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Google Analytics 4 measurement ID. Override via env if a separate
// property is ever wired up (e.g. for staging).
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-B56TGXHP73';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Plausible: cookieless, no PII, no consent banner needed (privacy
  // policy commits to this). Only loaded in production so dev hits
  // don't pollute the live dashboard.
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const enablePlausible =
    process.env.NODE_ENV === 'production' && plausibleDomain;

  // GA4 alongside Plausible — production-only so dev navigation doesn't
  // pollute the live dashboard.
  const enableGA = process.env.NODE_ENV === 'production' && GA_MEASUREMENT_ID;

  return (
    <html lang="en-GB" className={`${tenor.variable} ${dm.variable}`}>
      <body>{children}</body>
      {enablePlausible && (
        <Script
          defer
          data-domain={plausibleDomain}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      )}
      {enableGA && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
            `}
          </Script>
        </>
      )}
    </html>
  );
}
