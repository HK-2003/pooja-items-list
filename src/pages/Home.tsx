import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { Icon, useToast } from '../components/ui';
import UnitInput from '../components/UnitInput';
import { uid, usePersisted, type Entry, type Item, type PoojaFunction, type SavedList } from '../store';

interface Row {
  checked: boolean;
  qty: string;
  unit: string;
}
export interface Draft {
  id?: string;
  poojaName: string;
  hostName: string;
  date: string;
  place: string;
  notes: string;
  rows: Record<string, Row>;
  extras: Entry[];
}

export const emptyDraft = (): Draft => ({ poojaName: '', hostName: '', date: '', place: '', notes: '', rows: {}, extras: [] });

export function draftFromList(l: SavedList, items: Item[], keepId: boolean): Draft {
  const known = new Set(items.map((i) => i.id));
  const rows: Record<string, Row> = {};
  const extras: Entry[] = [];
  for (const e of l.entries) {
    if (known.has(e.itemId)) rows[e.itemId] = { checked: true, qty: e.qty, unit: e.unit };
    else extras.push({ ...e, itemId: e.itemId || uid() });
  }
  return { id: keepId ? l.id : undefined, poojaName: l.poojaName, hostName: l.hostName, date: keepId ? l.date : '', place: l.place, notes: l.notes, rows, extras };
}

export function useDraft() {
  return usePersisted<Draft>('draft', emptyDraft);
}

export default function Home({
  items,
  functions,
  draft,
  setDraft,
  onSaved,
}: {
  items: Item[];
  functions: PoojaFunction[];
  draft: Draft;
  setDraft: (d: Draft | ((d: Draft) => Draft)) => void;
  onSaved: (l: SavedList, share: boolean) => void;
}) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState<'' | 'save' | 'share'>('');
  const [errors, setErrors] = useState<{ name?: boolean; items?: boolean }>({});

  const row = (it: Item): Row => draft.rows[it.id] ?? { checked: false, qty: "", unit: it.unit };
  const setRow = (id: string, patch: Partial<Row>, it: Item) =>
    setDraft((d) => ({ ...d, rows: { ...d.rows, [id]: { ...(d.rows[id] ?? { checked: false, qty: "", unit: it.unit }), ...patch } } }));

  const visible = useMemo(() => items.filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase())), [items, q]);
  const selectedCount = items.filter((i) => draft.rows[i.id]?.checked).length + draft.extras.filter((e) => e.name.trim()).length;
  const allChecked = items.length > 0 && items.every((i) => draft.rows[i.id]?.checked);

  useEffect(() => {
    if (selectedCount) setErrors((e) => ({ ...e, items: false }));
  }, [selectedCount]);

  const toggleAll = () =>
    setDraft((d) => {
      const rows = { ...d.rows };
      for (const it of items) rows[it.id] = { ...(rows[it.id] ?? { qty: "", unit: it.unit }), checked: !allChecked };
      return { ...d, rows };
    });

  const set = (k: keyof Draft, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async (share: boolean) => {
    const entries: Entry[] = [
      ...items.filter((i) => draft.rows[i.id]?.checked).map((i) => ({ itemId: i.id, name: i.name, qty: draft.rows[i.id].qty, unit: draft.rows[i.id].unit })),
      ...draft.extras.filter((e) => e.name.trim()),
    ];
    const errs = { name: !draft.poojaName.trim(), items: entries.length === 0 };
    setErrors(errs);
    if (errs.name || errs.items) {
      toast(errs.name ? 'Enter the pooja / function name' : 'Select at least one item', 'err');
      if (errs.name) document.getElementById('poojaName')?.focus();
      return;
    }
    setSaving(share ? 'share' : 'save');
    try {
      const payload = { poojaName: draft.poojaName, hostName: draft.hostName, date: draft.date, place: draft.place, notes: draft.notes, entries };
      const saved = draft.id ? await api.updateList(draft.id, payload) : await api.createList(payload);
      toast(draft.id ? 'List updated' : 'List saved to dashboard');
      setDraft(emptyDraft());
      onSaved(saved, share);
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="page home">
      <section className="compose">
        <div className="compose-head">
          <span className="eyebrow">{draft.id ? 'Editing saved list' : 'New samagri list'}</span>
          {(draft.id || draft.poojaName || selectedCount > 0) && (
            <button className="btn btn-quiet sm" onClick={() => setDraft(emptyDraft())}>
              <Icon name="reset" size={15} /> {draft.id ? 'Cancel edit' : 'Clear'}
            </button>
          )}
        </div>
        <label className={`title-field ${errors.name ? 'invalid' : ''}`}>
          <span>Pooja / function name</span>
          <input id="poojaName" value={draft.poojaName} onChange={(e) => set('poojaName', e.target.value)} placeholder="ಉದಾ: ಗಣಪತಿ ಹೋಮಕ್ಕೆ" autoComplete="off" />
        </label>
        {functions.length > 0 && (
          <div className="fn-picks" role="group" aria-label="Predefined functions">
            {functions.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`fn-chip ${draft.poojaName.trim() === f.name ? 'on' : ''}`}
                aria-pressed={draft.poojaName.trim() === f.name}
                onClick={() => {
                  set('poojaName', f.name);
                  setErrors((e) => ({ ...e, name: false }));
                }}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
        <div className="meta-grid">
          <label className="field">
            <span>Host (ಯಜಮಾನರು) · not printed</span>
            <input value={draft.hostName} onChange={(e) => set('hostName', e.target.value)} placeholder="Optional" />
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} />
          </label>
          <label className="field">
            <span>Place</span>
            <input value={draft.place} onChange={(e) => set('place', e.target.value)} placeholder="Optional" />
          </label>
        </div>
      </section>

      <section className={`ledger ${errors.items ? 'invalid' : ''}`}>
        <div className="ledger-bar">
          <div className="search">
            <Icon name="search" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" aria-label="Search items" />
          </div>
          <button className="btn btn-quiet sm" onClick={toggleAll} disabled={!items.length}>
            {allChecked ? 'Unselect all' : 'Select all'}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="empty">
            <p>No items yet.</p>
            <p className="muted">Add samagri items in the Admin panel first.</p>
          </div>
        ) : (
          <ul className="rows">
            {visible.map((it, idx) => {
              const r = row(it);
              return (
                <li key={it.id} className={`item-row ${r.checked ? 'on' : ''}`}>
                  <label className="item-check">
                    <input type="checkbox" checked={r.checked} onChange={(e) => setRow(it.id, { checked: e.target.checked }, it)} />
                    <span className="box" aria-hidden="true">
                      <Icon name="check" size={14} />
                    </span>
                    <span className="idx">{String(items.indexOf(it) + 1 || idx + 1).padStart(2, '0')}</span>
                    <span className="item-name">{it.name}</span>
                  </label>
                  <div className="qty-group">
                    <input
                      className="qty"
                      value={r.qty}
                      onChange={(e) => setRow(it.id, { qty: e.target.value, checked: true }, it)}
                      placeholder="0"
                      aria-label={`Quantity for ${it.name}`}
                    />
                    <UnitInput value={r.unit} onChange={(v) => setRow(it.id, { unit: v, checked: true }, it)} ariaLabel={`Unit for ${it.name}`} />
                  </div>
                </li>
              );
            })}
            {visible.length === 0 && <li className="empty small muted">No items match “{q}”.</li>}
          </ul>
        )}

        <div className="extras">
          <div className="extras-head">
            <h3>Extra items for this list only</h3>
            <button
              className="btn btn-quiet sm"
              onClick={() => setDraft((d) => ({ ...d, extras: [...d.extras, { itemId: uid(), name: '', qty: '', unit: '' }] }))}
            >
              <Icon name="plus" size={15} /> Add
            </button>
          </div>
          {draft.extras.map((e, i) => (
            <div className="extra-row" key={e.itemId}>
              <input
                value={e.name}
                placeholder="Item name"
                aria-label="Extra item name"
                onChange={(ev) => setDraft((d) => ({ ...d, extras: d.extras.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)) }))}
              />
              <input
                className="qty"
                value={e.qty}
                placeholder="0"
                aria-label="Extra item quantity"
                onChange={(ev) => setDraft((d) => ({ ...d, extras: d.extras.map((x, j) => (j === i ? { ...x, qty: ev.target.value } : x)) }))}
              />
              <UnitInput value={e.unit} ariaLabel="Extra item unit" onChange={(v) => setDraft((d) => ({ ...d, extras: d.extras.map((x, j) => (j === i ? { ...x, unit: v } : x)) }))} />
              <button className="icon-btn" aria-label="Remove extra item" onClick={() => setDraft((d) => ({ ...d, extras: d.extras.filter((_, j) => j !== i) }))}>
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}
        </div>

        <label className="field notes">
          <span>Notes (printed at the bottom)</span>
          <textarea rows={2} value={draft.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" />
        </label>
      </section>

      <div className="action-bar">
        <div className="count">
          <strong>{selectedCount}</strong> <span>selected</span>
        </div>
        <button className="btn btn-ghost" onClick={() => save(false)} disabled={!!saving}>
          {saving === 'save' ? <span className="spinner" /> : <Icon name="save" />} Save
        </button>
        <button className="btn btn-primary" onClick={() => save(true)} disabled={!!saving}>
          {saving === 'share' ? <span className="spinner" /> : <Icon name="eye" />} Save & preview
        </button>
      </div>
    </div>
  );
}
