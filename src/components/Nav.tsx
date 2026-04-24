import Link from 'next/link';
import styles from './Nav.module.css';

type Props = {
  variant?: 'overlay' | 'solid';
};

/**
 * Site navigation. "overlay" sits absolute on top of a hero photo (used on
 * the homepage); "solid" has its own JD-green background for internal pages.
 */
export function Nav({ variant = 'overlay' }: Props) {
  const cls = `${styles.nav} ${variant === 'solid' ? styles.solid : ''}`.trim();
  return (
    <nav className={cls} aria-label="Primary">
      <Link href="/" className={styles.brand}>
        Hampshire Paddock Management
      </Link>
      <ul className={styles.links}>
        <li><Link href="/services">Services</Link></li>
        <li><Link href="/#fleet">The fleet</Link></li>
        <li><Link href="/gallery">Gallery</Link></li>
        <li><Link href="/about">About</Link></li>
        <li><Link href="/contact">Contact</Link></li>
      </ul>
      <Link href="/contact" className={styles.cta}>
        Get a quote
      </Link>
    </nav>
  );
}
