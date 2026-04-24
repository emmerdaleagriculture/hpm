import styles from './PhoneStrip.module.css';

export function PhoneStrip() {
  return (
    <section className={styles.strip}>
      <div className={styles.row}>
        <span className={styles.label}>Call us direct</span>
        <span className={styles.divider} />
        <a href="tel:07825156062" className={styles.number}>
          07825 156062
        </a>
        <span className={styles.divider} />
        <span className={styles.label}>Hampshire &amp; surrounding counties</span>
      </div>
      <div className={styles.coverage}>
        Covering Hampshire, Wiltshire, Berkshire, East Sussex, Dorset and Surrey
      </div>
    </section>
  );
}
