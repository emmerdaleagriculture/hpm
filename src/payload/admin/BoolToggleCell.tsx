'use client';

import { useState } from 'react';

type Props = {
  cellData?: boolean | null;
  rowData?: Record<string, unknown> & { id?: string | number };
  field?: { name?: string };
};

export function BoolToggleCell({ cellData, rowData, field }: Props) {
  const id = rowData?.id;
  const name = field?.name;
  // Payload v3 has had bugs where cellData arrives undefined for custom Cells
  // (see payload#8207). Fall back to rowData[name] so the checkbox renders
  // the actual stored value rather than always-unchecked.
  const initial =
    cellData === true ||
    (cellData === undefined && name ? rowData?.[name] === true : false);
  const [checked, setChecked] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function onToggle(e: React.ChangeEvent<HTMLInputElement>) {
    if (!id || !name || busy) return;
    const next = e.target.checked;
    setBusy(true);
    setChecked(next);
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [name]: next }),
      });
      if (!res.ok) throw new Error(`PATCH /api/media/${id}: ${res.status}`);
    } catch (err) {
      console.error(err);
      setChecked(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={busy}
      onChange={onToggle}
      onClick={(e) => e.stopPropagation()}
      style={{ width: 18, height: 18, cursor: busy ? 'wait' : 'pointer' }}
      aria-label={name ?? 'toggle'}
    />
  );
}
