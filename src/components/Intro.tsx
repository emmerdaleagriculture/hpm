import Link from 'next/link';
import styles from './Intro.module.css';

export function Intro() {
  return (
    <section className={styles.intro}>
      <div className={styles.eyebrow}>About us</div>
      <h2 className={styles.lede}>
        We manage the land, <em>you manage the horses.</em>
      </h2>
      <p className={styles.body}>
        Paddock topping, harrowing, overseeding, ragwort control and eleven more
        services — delivered across Hampshire with a modern compact fleet that
        leaves no ruts, no compaction, and no surprises on the invoice. With a
        background in dairy and equine livery, and the backing of a John Deere
        main dealer, we bring genuine agricultural capability to paddocks and
        smallholdings.
      </p>
      <Link href="/about" className={styles.btn}>
        Read our story →
      </Link>
    </section>
  );
}
