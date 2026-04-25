'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SITE_PHONE, SITE_PHONE_TEL } from '@/lib/site';
import styles from './Nav.module.css';

type Props = {
  variant?: 'overlay' | 'solid';
};

const LINKS = [
  { href: '/services', label: 'Services', match: (p: string) => p === '/services' || p.startsWith('/services/') },
  { href: '/gallery',  label: 'Gallery',  match: (p: string) => p === '/gallery' || p.startsWith('/gallery/') },
  { href: '/notes',    label: 'Notes',    match: (p: string) => p === '/notes' || p.startsWith('/notes/') },
  { href: '/about',    label: 'About',    match: (p: string) => p === '/about' },
  { href: '/contact',  label: 'Contact',  match: (p: string) => p === '/contact' },
];

/**
 * Site navigation. "overlay" sits absolute on top of a hero photo (used on
 * the homepage and other hero-led pages); "solid" has its own JD-green
 * background for internal pages like /privacy.
 *
 * Below 900px the desktop links + CTA are hidden and a burger toggles
 * a top-down dropdown menu with the same links plus phone + CTA.
 */
export function Nav({ variant = 'overlay' }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);

  // Close on route change (e.g. when a mobile-menu link is tapped).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll, bind Escape, focus management while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    // Focus the first link when opening
    requestAnimationFrame(() => firstMobileLinkRef.current?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      // Return focus to the burger
      burgerRef.current?.focus();
    };
  }, [open]);

  const navCls = `${styles.nav} ${variant === 'solid' ? styles.solid : ''}`.trim();

  return (
    <>
      <nav className={navCls} aria-label="Primary">
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
        <button
          ref={burgerRef}
          type="button"
          className={`${styles.burger} ${open ? styles.burgerOpen : ''}`.trim()}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.burgerIcon} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </nav>

      {/* Overlay — separate node so animations are independent of the menu */}
      <div
        className={`${styles.mobileOverlay} ${open ? styles.mobileOverlayOpen : ''}`.trim()}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile menu — slides down from top */}
      <div
        id="mobile-menu"
        className={`${styles.mobileMenu} ${open ? styles.mobileMenuOpen : ''}`.trim()}
        aria-hidden={!open}
      >
        <ul className={styles.mobileLinks}>
          {LINKS.map((link, i) => {
            const active = link.match(pathname ?? '');
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={active ? styles.mobileActive : undefined}
                  aria-current={active ? 'page' : undefined}
                  ref={i === 0 ? firstMobileLinkRef : undefined}
                  tabIndex={open ? 0 : -1}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className={styles.mobileFooter}>
          <div className={styles.mobilePhoneEyebrow}>Call directly</div>
          <a
            href={`tel:${SITE_PHONE_TEL}`}
            className={styles.mobilePhone}
            tabIndex={open ? 0 : -1}
          >
            {SITE_PHONE}
          </a>
          <div className={styles.mobilePhoneSub}>Available any time, any day</div>
          <Link
            href="/contact"
            className={styles.mobileCta}
            tabIndex={open ? 0 : -1}
          >
            Get a quote →
          </Link>
        </div>
      </div>
    </>
  );
}
