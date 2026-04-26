import { Tenor_Sans, DM_Sans } from 'next/font/google';

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

/**
 * Layout for /admin-stats. Sits outside both (frontend) and (payload)
 * route groups so it doesn't inherit the public Nav/Footer or the
 * Payload admin chrome. Just provides the project's font variables.
 */
export default function AdminStatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" className={`${tenor.variable} ${dm.variable}`}>
      <body style={{ background: '#fff', margin: 0 }}>{children}</body>
    </html>
  );
}
