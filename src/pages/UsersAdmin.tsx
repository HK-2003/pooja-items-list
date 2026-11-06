import { useEffect, useState } from 'react';
import { api } from '../api';
import type { User } from '../store';

type Row = User & { lists: number; createdAt: number };

export default function UsersAdmin() {
  const [users, setUsers] = useState<Row[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    api.adminUsers().then(setUsers).catch((e) => setErr((e as Error).message));
  }, []);

  if (err) return <div className="empty muted">{err}</div>;
  if (!users) return <div className="loading-block"><span className="spinner dark" /> Loading users…</div>;

  const s = q.trim().toLowerCase();
  const shown = s ? users.filter((u) => [u.name, u.place, u.phone].some((v) => v.toLowerCase().includes(s))) : users;

  return (
    <>
      <div className="ledger-bar">
        <div className="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, place or phone" aria-label="Search users" />
        </div>
        <span className="pill">{users.length} registered</span>
      </div>
      <ul className="rows admin-rows">
        {shown.map((u) => (
          <li key={u.id} className="item-row user-row">
            <span className="avatar sm" aria-hidden="true">{u.name.charAt(0)}</span>
            <div className="user-main">
              <span className="item-name">{u.name}</span>
              <span className="muted small">{u.place} · {u.phone}</span>
            </div>
            <span className="muted small">{u.lists} lists · joined {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </li>
        ))}
        {shown.length === 0 && <li className="empty small muted">{users.length ? 'No users match.' : 'No one has registered yet.'}</li>}
      </ul>
    </>
  );
}
