import styles from './StatBand.module.css';

export function StatBand() {
  return (
    <section className={styles.band}>
      <div className={styles.stat}>
        <div className={styles.num}>4<span className={styles.unit}>John Deeres</span></div>
        <div className={styles.label}>Modern compact fleet</div>
      </div>
      <div className={styles.stat}>
        <div className={styles.num}>16<span className={styles.unit}>+</span></div>
        <div className={styles.label}>Specialist implements</div>
      </div>
      <div className={styles.stat}>
        <div className={styles.num}>PA1 / PA2</div>
        <div className={styles.label}>Licensed spraying</div>
      </div>
      <div className={styles.stat}>
        <div className={styles.num}>£2m<span className={styles.unit}>+</span></div>
        <div className={styles.label}>Public liability</div>
      </div>
    </section>
  );
}
