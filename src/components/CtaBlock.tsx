import Link from 'next/link';
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
          Most quotes come back the same day. If it&apos;s straightforward we&apos;ll
          give you a figure on the phone. If it needs a visit, we come out at no
          cost.
        </p>
        <div className={styles.actions}>
          <Link href="/contact" className={styles.btnYellow}>
            Request a free quote →
          </Link>
          <span className={styles.or}>or call</span>
          <a href="tel:07825156062" className={styles.phone}>
            07825 156062
          </a>
        </div>
      </div>
    </section>
  );
}
