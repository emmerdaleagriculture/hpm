import styles from './AsideCards.module.css';

export type EquipmentItem = {
  name: string;
  spec?: string | null;
};

export function EquipmentCard({ items }: { items?: EquipmentItem[] | null }) {
  const rows = Array.isArray(items) ? items.filter((i) => i && i.name) : [];
  if (rows.length === 0) return null;
  return (
    <div className={styles.card}>
      <div className={styles.label}>— Equipment used</div>
      <ul className={styles.equipmentList}>
        {rows.map((it, i) => (
          <li key={i}>
            <div className={styles.equipmentName}>{it.name}</div>
            {it.spec && <div className={styles.equipmentSpec}>{it.spec}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export type MetaHighlights = {
  bestTime?: string | null;
  frequency?: string | null;
  minPaddock?: string | null;
  quoteTurnaround?: string | null;
};

export function AtAGlanceCard({ meta }: { meta?: MetaHighlights | null }) {
  if (!meta) return null;
  const rows: Array<[string, string]> = [];
  if (meta.bestTime) rows.push(['Best time', meta.bestTime]);
  if (meta.frequency) rows.push(['Frequency', meta.frequency]);
  if (meta.minPaddock) rows.push(['Min paddock', meta.minPaddock]);
  if (meta.quoteTurnaround) rows.push(['Quote in', meta.quoteTurnaround]);
  if (rows.length === 0) return null;
  return (
    <div className={styles.card}>
      <div className={styles.label}>— At a glance</div>
      <ul className={styles.metaList}>
        {rows.map(([label, value]) => (
          <li key={label}>
            <span className={styles.metaLabel}>{label}</span>
            <span className={styles.metaValue}>{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
