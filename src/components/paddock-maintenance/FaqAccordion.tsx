'use client';

import { useState } from 'react';
import styles from './FaqAccordion.module.css';

export type FaqItem = {
  q: string;
  /** Plain text — used in the JSON-LD (no HTML allowed there). */
  a: string;
  /** Optional rich version with anchors. Falls back to `a` if absent. */
  rich?: React.ReactNode;
};

/**
 * Plain accordion. Tracks an open Set so multiple panels can be open
 * at once (rather than the radio-button mutual-exclusion pattern).
 * The first item is open by default.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set([0]));

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className={styles.list}>
      {items.map((item, i) => {
        const isOpen = open.has(i);
        const panelId = `faq-panel-${i}`;
        return (
          <div
            key={item.q}
            className={`${styles.item} ${isOpen ? styles.open : ''}`}
          >
            <button
              type="button"
              className={styles.question}
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              aria-controls={panelId}
            >
              <span>{item.q}</span>
              <span className={styles.toggle} aria-hidden="true">
                +
              </span>
            </button>
            <div
              id={panelId}
              className={styles.answer}
              role="region"
              hidden={!isOpen}
            >
              <div className={styles.answerInner}>{item.rich ?? <p>{item.a}</p>}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
