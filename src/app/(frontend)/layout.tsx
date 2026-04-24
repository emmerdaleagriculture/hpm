import type { Metadata } from 'next';
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
// Note: better default than the current WP site's "Home - hampshirepaddockmanagement.com"
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
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" className={`${tenor.variable} ${dm.variable}`}>
      <body>{children}</body>
    </html>
  );
}
