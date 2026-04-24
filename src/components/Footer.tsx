import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        <div>
          <div className={styles.brand}>Hampshire Paddock Management</div>
          <p className={styles.desc}>
            Modern paddock &amp; smallholding management for horse owners and
            landowners across Hampshire and the surrounding counties.
          </p>
        </div>

        <div className={styles.col}>
          <h4>Services</h4>
          <ul>
            <li><Link href="/paddock-topping">Paddock topping</Link></li>
            <li><Link href="/field-harrowing">Chain harrowing</Link></li>
            <li><Link href="/overseeding">Overseeding</Link></li>
            <li><Link href="/ragwort-pulling">Ragwort control</Link></li>
            <li><Link href="/services">All services</Link></li>
          </ul>
        </div>

        <div className={styles.col}>
          <h4>More</h4>
          <ul>
            <li><Link href="/#fleet">The fleet</Link></li>
            <li><Link href="/gallery">Gallery</Link></li>
            <li><Link href="/blog">Notes from the field</Link></li>
            <li><Link href="/about">About</Link></li>
          </ul>
        </div>

        <div className={styles.col}>
          <h4>Contact</h4>
          <ul>
            <li><a href="tel:07825156062">07825 156062</a></li>
            <li><a href="mailto:tom@hampshirepaddockmanagement.com">tom@hampshirepaddockmanagement.com</a></li>
            <li style={{ marginTop: 10 }}>Hampshire, United Kingdom</li>
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>© {year} Emmerdale Agriculture Ltd · Company No. 14950816</span>
        <nav className={styles.bottomLinks} aria-label="Legal">
          <Link href="/privacy">Privacy policy</Link>
        </nav>
        <span>Made with care in Hampshire</span>
      </div>
    </footer>
  );
}
