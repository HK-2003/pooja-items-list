import { useState } from 'react';
import { api } from '../api';
import { Confirm, Icon } from '../components/ui';
import type { PoojaFunction } from '../store';

export default function FunctionsAdmin({
  functions,
  setFunctions,
  run,
  busy,
}: {
  functions: PoojaFunction[];
  setFunctions: (f: PoojaFunction[]) => void;
  run: (fn: () => Promise<void>, ok?: string) => void;
  busy: boolean;
}) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState('');
  const [toDelete, setToDelete] = useState<PoojaFunction | null>(null);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    run(async () => {
      const f = await api.addFunction(name);
      setFunctions([...functions, f]);
      setName('');
      document.getElementById('newFnName')?.focus();
    }, 'Function added');
  };

  const saveEdit = (id: string) =>
    run(async () => {
      const f = await api.updateFunction(id, edit);
      setFunctions(functions.map((x) => (x.id === id ? f : x)));
      setEditing(null);
    }, 'Function updated');

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= functions.length) return;
    const next = [...functions];
    [next[i], next[j]] = [next[j], next[i]];
    setFunctions(next);
    run(async () => setFunctions(await api.reorderFunctions(next.map((x) => x.id))));
  };

  return (
    <>
      <form className="add-form" onSubmit={add}>
        <input id="newFnName" value={name} onChange={(e) => setName(e.target.value)} placeholder="New function name (ಉದಾ: ಗಣಪತಿ ಹೋಮಕ್ಕೆ)" aria-label="Function name" />
        <button className="btn btn-primary" disabled={!name.trim() || busy}>
          <Icon name="plus" /> Add function
        </button>
      </form>
      <p className="muted small hint">These appear as quick picks under “Pooja / function name” on the New list page.</p>

      <ul className="rows admin-rows solo">
        {functions.map((f, i) =>
          editing === f.id ? (
            <li key={f.id} className="item-row editing">
              <input value={edit} autoFocus aria-label="Function name" onChange={(e) => setEdit(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && edit.trim() && saveEdit(f.id)} />
              <div className="row-actions">
                <button className="icon-btn ok" aria-label="Save" onClick={() => saveEdit(f.id)} disabled={!edit.trim()}>
                  <Icon name="check" size={17} />
                </button>
                <button className="icon-btn" aria-label="Cancel" onClick={() => setEditing(null)}>
                  <Icon name="x" size={17} />
                </button>
              </div>
            </li>
          ) : (
            <li key={f.id} className="item-row">
              <span className="idx">{String(i + 1).padStart(2, '0')}</span>
              <span className="item-name">{f.name}</span>
              <div className="row-actions">
                <button className="icon-btn" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                  <Icon name="up" size={16} />
                </button>
                <button className="icon-btn" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === functions.length - 1}>
                  <Icon name="down" size={16} />
                </button>
                <button
                  className="icon-btn"
                  aria-label="Edit"
                  onClick={() => {
                    setEditing(f.id);
                    setEdit(f.name);
                  }}
                >
                  <Icon name="edit" size={16} />
                </button>
                <button className="icon-btn danger" aria-label="Delete" onClick={() => setToDelete(f)}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </li>
          ),
        )}
        {functions.length === 0 && <li className="empty small muted">No functions yet — add your first one above.</li>}
      </ul>

      <Confirm
        open={!!toDelete}
        title="Delete function?"
        message={`“${toDelete?.name}” will be removed from quick picks. Saved lists are not affected.`}
        onConfirm={() =>
          toDelete &&
          run(async () => {
            await api.deleteFunction(toDelete.id);
            setFunctions(functions.filter((x) => x.id !== toDelete.id));
          }, 'Function deleted')
        }
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
