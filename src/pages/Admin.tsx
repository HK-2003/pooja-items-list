import { useEffect, useState } from 'react';
import { api, hasAdminPin, setAdminPin } from '../api';
import { Confirm, Icon, useToast } from '../components/ui';
import UnitInput from '../components/UnitInput';
import FunctionsAdmin from './FunctionsAdmin';
import LogoPanel from './LogoPanel';
import UsersAdmin from './UsersAdmin';
import { type PoojaFunction, type Item, type Settings } from '../store';

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await api.verifyPin(pin);
    setBusy(false);
    if (ok) {
      setAdminPin(pin);
      onUnlock();
    } else setErr('Incorrect PIN, or server unreachable');
  };
  return (
    <div className="page gate">
      <form className="gate-card" onSubmit={submit}>
        <div className="gate-icon">
          <Icon name="lock" size={22} />
        </div>
        <h1>Admin panel</h1>
        <p className="muted">Enter your PIN to manage samagri items and sheet details.</p>
        <input
          className={`pin ${err ? 'invalid' : ''}`}
          inputMode="numeric"
          type="password"
          autoFocus
          value={pin}
          maxLength={8}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ''));
            setErr('');
          }}
          aria-label="Admin PIN"
          placeholder="••••"
        />
        {err && <p className="error-text">{err}</p>}
        <button className="btn btn-primary block" disabled={pin.length < 4 || busy}>
          {busy ? <span className="spinner" /> : null} Unlock
        </button>
        <p className="muted small">Default PIN is 1234 — change it after first login.</p>
      </form>
    </div>
  );
}

export default function Admin({
  items,
  setItems,
  settings,
  setSettings,
  functions,
  setFunctions,
}: {
  functions: PoojaFunction[];
  setFunctions: (f: PoojaFunction[]) => void;
  items: Item[];
  setItems: (i: Item[]) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
}) {
  const toast = useToast();
  const [unlocked, setUnlocked] = useState(hasAdminPin());
  const [tab, setTab] = useState<'items' | 'functions' | 'users' | 'sheet'>('items');
  const [form, setForm] = useState({ name: '', qty: '', unit: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState({ name: '', qty: '', unit: '' });
  const [toDelete, setToDelete] = useState<Item | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [sForm, setSForm] = useState(settings);
  const [newPin, setNewPin] = useState('');

  useEffect(() => setSForm(settings), [settings]);

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;

  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'Invalid PIN') {
        setAdminPin('');
        setUnlocked(false);
      }
      toast(msg, 'err');
    } finally {
      setBusy(false);
    }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    run(async () => {
      const it = await api.addItem(form);
      setItems([...items, it]);
      setForm({ name: '', qty: '', unit: '' });
      document.getElementById('newItemName')?.focus();
    }, 'Item added');
  };

  const saveEdit = (id: string) =>
    run(async () => {
      const it = await api.updateItem(id, edit);
      setItems(items.map((x) => (x.id === id ? it : x)));
      setEditing(null);
    }, 'Item updated');

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    run(async () => setItems(await api.reorderItems(next.map((x) => x.id))));
  };

  const visible = items.filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="page admin">
      <header className="dash-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Manage samagri</h1>
        </div>
        <button
          className="btn btn-quiet sm"
          onClick={() => {
            setAdminPin('');
            setUnlocked(false);
          }}
        >
          <Icon name="logout" size={15} /> Lock
        </button>
      </header>

      <div className="seg" role="tablist">
        <button role="tab" aria-selected={tab === 'items'} className={tab === 'items' ? 'on' : ''} onClick={() => setTab('items')}>
          Items <span className="pill">{items.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'functions'} className={tab === 'functions' ? 'on' : ''} onClick={() => setTab('functions')}>
          Functions <span className="pill">{functions.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'users'} className={tab === 'users' ? 'on' : ''} onClick={() => setTab('users')}>
          Users
        </button>
        <button role="tab" aria-selected={tab === 'sheet'} className={tab === 'sheet' ? 'on' : ''} onClick={() => setTab('sheet')}>
          Sheet & security
        </button>
      </div>

      {tab === 'users' ? (
        <UsersAdmin />
      ) : tab === 'functions' ? (
        <FunctionsAdmin functions={functions} setFunctions={setFunctions} run={run} busy={busy} />
      ) : tab === 'items' ? (
        <>
          <form className="add-form" onSubmit={add}>
            <input id="newItemName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="New item name (ಉದಾ: ಹೊದಳು)" aria-label="Item name" />
            <input className="qty" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="Default qty" aria-label="Default quantity" />
            <UnitInput value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} ariaLabel="Default unit" />
            <button className="btn btn-primary" disabled={!form.name.trim() || busy}>
              <Icon name="plus" /> Add item
            </button>
          </form>

          <div className="ledger-bar">
            <div className="search">
              <Icon name="search" size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" aria-label="Search items" />
            </div>
            <button className="btn btn-quiet sm" onClick={() => setConfirmReset(true)}>
              <Icon name="reset" size={15} /> Restore default list
            </button>
          </div>

          <ul className="rows admin-rows">
            {visible.map((it) => {
              const i = items.indexOf(it);
              return editing === it.id ? (
                <li key={it.id} className="item-row editing">
                  <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} aria-label="Item name" autoFocus onKeyDown={(e) => e.key === 'Enter' && saveEdit(it.id)} />
                  <input className="qty" value={edit.qty} onChange={(e) => setEdit({ ...edit, qty: e.target.value })} aria-label="Default quantity" />
                  <UnitInput value={edit.unit} onChange={(v) => setEdit({ ...edit, unit: v })} ariaLabel="Default unit" onEnter={() => saveEdit(it.id)} />
                  <div className="row-actions">
                    <button className="icon-btn ok" aria-label="Save" onClick={() => saveEdit(it.id)} disabled={!edit.name.trim()}>
                      <Icon name="check" size={17} />
                    </button>
                    <button className="icon-btn" aria-label="Cancel" onClick={() => setEditing(null)}>
                      <Icon name="x" size={17} />
                    </button>
                  </div>
                </li>
              ) : (
                <li key={it.id} className="item-row">
                  <span className="idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="item-name">{it.name}</span>
                  <span className="muted default-qty">{[it.qty, it.unit].filter(Boolean).join(' ') || '—'}</span>
                  <div className="row-actions">
                    <button className="icon-btn" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0 || !!q}>
                      <Icon name="up" size={16} />
                    </button>
                    <button className="icon-btn" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === items.length - 1 || !!q}>
                      <Icon name="down" size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(it.id);
                        setEdit({ name: it.name, qty: it.qty, unit: it.unit });
                      }}
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button className="icon-btn danger" aria-label="Delete" onClick={() => setToDelete(it)}>
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
            {visible.length === 0 && <li className="empty small muted">{items.length ? 'No items match.' : 'No items yet — add your first one above.'}</li>}
          </ul>
        </>
      ) : (
        <div className="settings-grid">
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => setSettings(await api.saveSettings(sForm)), 'Sheet details saved');
            }}
          >
            <h3>Sheet header</h3>
            <p className="muted small">Shared by everyone. Name, place and phone come from each user’s own profile.</p>
            {(
              [
                ['symbol', 'Top symbol'],
                ['blessing', 'Default blessing line'],
                ['subtitle', 'Text after pooja name'],
              ] as [keyof Settings, string][]
            ).map(([k, label]) => (
              <label className="field" key={k}>
                <span>{label}</span>
                <input value={sForm[k]} onChange={(e) => setSForm({ ...sForm, [k]: e.target.value })} inputMode={k === 'phone' ? 'tel' : undefined} />
              </label>
            ))}
            <button className="btn btn-primary" disabled={busy}>
              <Icon name="save" /> Save details
            </button>
          </form>

          <div className="side-stack">
          <LogoPanel settings={settings} setSettings={setSettings} run={run} busy={busy} />
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await api.saveSettings({ pin: newPin });
                setAdminPin(newPin);
                setNewPin('');
              }, 'PIN changed');
            }}
          >
            <h3>Admin PIN</h3>
            <p className="muted small">4–8 digits. Needed to open this panel.</p>
            <label className="field">
              <span>New PIN</span>
              <input type="password" inputMode="numeric" value={newPin} maxLength={8} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} />
            </label>
            <button className="btn btn-ghost" disabled={newPin.length < 4 || busy}>
              <Icon name="lock" /> Change PIN
            </button>
          </form>
          </div>
        </div>
      )}

      <Confirm
        open={!!toDelete}
        title="Delete item?"
        message={`“${toDelete?.name}” will be removed from the item list. Saved lists are not affected.`}
        onConfirm={() =>
          toDelete &&
          run(async () => {
            await api.deleteItem(toDelete.id);
            setItems(items.filter((x) => x.id !== toDelete.id));
          }, 'Item deleted')
        }
        onClose={() => setToDelete(null)}
      />
      <Confirm
        open={confirmReset}
        title="Restore default list?"
        message="All current items will be replaced by the original 37-item list. Saved lists are not affected."
        confirmLabel="Restore"
        onConfirm={() => run(async () => setItems(await api.resetItems()), 'Default items restored')}
        onClose={() => setConfirmReset(false)}
      />
    </div>
  );
}
