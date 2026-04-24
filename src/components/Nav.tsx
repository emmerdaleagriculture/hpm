'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Nav.module.css';

type Props = {
  variant?: 'overlay' | 'solid';
};

const LINKS = [
  { href: '/services', label: 'Services', match: (p: string) => p === '/services' || p.startsWith('/services/') },
  { href: '/gallery',  label: 'Gallery',  match: (p: string) => p === '/gallery' || p.startsWith('/gallery/') },
  { href: '/about',    label: 'About',    match: (p: string) => p === '/about' },
  { href: '/contact',  label: 'Contact',  match: (p: string) => p === '/contact' },
];

/**
 * Site navigation. "overlay" sits absolute on top of a hero photo (used on
 * the homepage and other hero-led pages); "solid" has its own JD-green
 * background for internal pages like /privacy.
 */
export function Nav({ variant = 'overlay' }: Props) {
  const pathname = usePathname();
  const cls = `${styles.nav} ${variant === 'solid' ? styles.solid : ''}`.trim();

  return (
    <nav className={cls} aria-label="Primary">
      <Link href="/" className={styles.brand}>
        Hampshire Paddock Management
      </Link>
      <ul className={styles.links}>
        {LINKS.map((link) => {
          const active = link.match(pathname ?? '');
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={active ? styles.active : undefined}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href="/contact" className={styles.cta}>
        Get a quote
      </Link>
    </nav>
  );
}
