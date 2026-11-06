import { useMemo, useState } from 'react';
import { Confirm, Icon } from '../components/ui';
import type { SavedList } from '../store';

const fmtDate = (d: string) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return isNaN(+dt) ? d : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const ago = (ts: number) => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function Dashboard({
  lists,
  loading,
  highlight,
  onShare,
  onEdit,
  onDuplicate,
  onDelete,
  onNew,
}: {
  lists: SavedList[];
  loading: boolean;
  highlight?: string;
  onShare: (l: SavedList) => void;
  onEdit: (l: SavedList) => void;
  onDuplicate: (l: SavedList) => void;
  onDelete: (l: SavedList) => void;
  onNew: () => void;
}) {
  const [q, setQ] = useState('');
  const [toDelete, setToDelete] = useState<SavedList | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? lists.filter((l) => [l.poojaName, l.hostName, l.place].some((v) => v?.toLowerCase().includes(s))) : lists;
  }, [lists, q]);

  const totalItems = lists.reduce((a, l) => a + l.entries.length, 0);
  const thisMonth = lists.filter((l) => new Date(l.createdAt).getMonth() === new Date().getMonth() && new Date(l.createdAt).getFullYear() === new Date().getFullYear()).length;

  return (
    <div className="page dash">
      <header className="dash-head">
        <div>
          <span className="eyebrow">Saved lists</span>
          <h1>Dashboard</h1>
        </div>
        <dl className="stats">
          <div>
            <dt>Lists</dt>
            <dd>{lists.length}</dd>
          </div>
          <div>
            <dt>This month</dt>
            <dd>{thisMonth}</dd>
          </div>
          <div>
            <dt>Items listed</dt>
            <dd>{totalItems}</dd>
          </div>
        </dl>
      </header>

      <div className="search wide">
        <Icon name="search" size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by pooja, host or place" aria-label="Search saved lists" />
      </div>

      {loading ? (
        <div className="cards">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty big">
          <div className="empty-mark">ॐ</div>
          <p>{lists.length ? 'No lists match your search.' : 'No saved lists yet.'}</p>
          {!lists.length && (
            <button className="btn btn-primary" onClick={onNew}>
              <Icon name="plus" /> Create first list
            </button>
          )}
        </div>
      ) : (
        <div className="cards">
          {filtered.map((l) => (
            <article key={l.id} className={`card ${highlight === l.id ? 'fresh' : ''}`}>
              <div className="card-main" role="button" tabIndex={0} onClick={() => onShare(l)} onKeyDown={(e) => e.key === 'Enter' && onShare(l)}>
                <div className="card-top">
                  <span className="pill">{l.entries.length} items</span>
                  <span className="muted small">{l.date ? fmtDate(l.date) : `Saved ${ago(l.updatedAt)}`}</span>
                </div>
                <h3>{l.poojaName}</h3>
                <p className="muted small">{[l.hostName, l.place].filter(Boolean).join(' · ') || 'No host or place added'}</p>
                <p className="card-peek">{l.entries.slice(0, 5).map((e) => e.name).join(', ')}{l.entries.length > 5 ? '…' : ''}</p>
              </div>
              <div className="card-actions">
                <button className="btn btn-primary sm" onClick={() => onShare(l)}>
                  <Icon name="eye" size={15} /> Preview
                </button>
                <button className="icon-btn" title="Edit" aria-label="Edit list" onClick={() => onEdit(l)}>
                  <Icon name="edit" size={17} />
                </button>
                <button className="icon-btn" title="Duplicate as new" aria-label="Duplicate list" onClick={() => onDuplicate(l)}>
                  <Icon name="copy" size={17} />
                </button>
                <button className="icon-btn danger" title="Delete" aria-label="Delete list" onClick={() => setToDelete(l)}>
                  <Icon name="trash" size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Confirm
        open={!!toDelete}
        title="Delete this list?"
        message={`“${toDelete?.poojaName}” will be removed permanently.`}
        onConfirm={() => toDelete && onDelete(toDelete)}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
