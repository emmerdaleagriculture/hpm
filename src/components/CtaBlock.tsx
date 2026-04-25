import Link from 'next/link';
import { SITE_PHONE, SITE_PHONE_TEL } from '@/lib/site';
import styles from './CtaBlock.module.css';

export function CtaBlock() {
  return (
    <section className={styles.block}>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>Ready when you are</div>
        <h2 className={styles.headline}>
          Tell us about <em>your paddock.</em>
        </h2>
        <p className={styles.sub}>
          Usually replies within hours, day or night. If it&apos;s straightforward
          we&apos;ll give you a figure on the phone. If it needs a visit, we come
          out at no cost.
        </p>
        <div className={styles.actions}>
          <Link href="/contact" className={styles.btnYellow}>
            Request a free quote →
          </Link>
          <span className={styles.or}>or call</span>
          <a href={`tel:${SITE_PHONE_TEL}`} className={styles.phone}>
            {SITE_PHONE}
          </a>
        </div>
      </div>
    </section>
  );
}
