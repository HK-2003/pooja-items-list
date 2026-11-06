import { useCallback, useEffect, useState } from 'react';
import { api, getUserId, setUserId } from './api';
import logo from '/logo.png';
import ShareModal from './components/ShareModal';
import { Icon, useToast } from './components/ui';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Home, { draftFromList, emptyDraft, useDraft } from './pages/Home';
import Onboarding, { ProfileModal } from './pages/Onboarding';
import type { Item, PoojaFunction, SavedList, Settings, User } from './store';

type Tab = 'home' | 'dash' | 'admin';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'New list', icon: 'list' },
  { id: 'dash', label: 'Dashboard', icon: 'grid' },
  { id: 'admin', label: 'Admin', icon: 'gear' },
];

const blankSettings: Settings = { symbol: 'ॐ', blessing: '', priestName: '', place: '', phone: '', subtitle: '' };

export default function App() {
  const toast = useToast();
  const [tab, setTabState] = useState<Tab>(() => (location.hash.slice(1) as Tab) || 'home');
  const [items, setItems] = useState<Item[]>([]);
  const [functions, setFunctions] = useState<PoojaFunction[]>([]);
  const [lists, setLists] = useState<SavedList[]>([]);
  const [settings, setSettings] = useState<Settings>(blankSettings);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sharing, setSharing] = useState<SavedList | null>(null);
  const [highlight, setHighlight] = useState<string>();
  const [draft, setDraft] = useDraft();
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const setTab = (t: Tab) => {
    setTabState(t);
    history.replaceState(null, '', '#' + t);
    window.scrollTo({ top: 0 });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [i, s, f] = await Promise.all([api.items(), api.settings(), api.functions()]);
      setFunctions(f);
      setItems(i);
      setSettings(s);
      const uid = getUserId();
      if (uid) {
        try {
          setUser(await api.user(uid));
          setLists(await api.lists());
        } catch (e) {
          // Profile removed on the server: ask for details again
          if ((e as Error).message === 'User not found') setUserId('');
          else throw e;
        }
      }
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const minSplash = new Promise((r) => setTimeout(r, 1100));
    Promise.all([load(), minSplash]).then(() => setBooting(false));
  }, [load]);

  const onSaved = (l: SavedList, share: boolean) => {
    setLists((ls) => [l, ...ls.filter((x) => x.id !== l.id)]);
    setHighlight(l.id);
    setTab('dash');
    if (share) setSharing(l);
  };

  const onDelete = async (l: SavedList) => {
    try {
      await api.deleteList(l.id);
      setLists((ls) => ls.filter((x) => x.id !== l.id));
      toast('List deleted');
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  };

  if (booting) return <Splash />;
  if (!user && !loadError)
    return (
      <Onboarding
        blessingHint={settings.blessing}
        onDone={async (u) => {
          setUser(u);
          setDraft(emptyDraft());
          try {
            setLists(await api.lists());
          } catch {
            setLists([]);
          }
        }}
      />
    );

  // Per-user details override the shared sheet header
  const sheetSettings: Settings = user
    ? { ...settings, priestName: user.name, place: user.place, phone: user.phone, blessing: user.blessing || settings.blessing }
    : settings;

  const signOut = () => {
    setUserId('');
    setUser(null);
    setLists([]);
    setDraft(emptyDraft());
    setProfileOpen(false);
    setTab('home');
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <img className="brand-mark" src={logo} alt="" width={40} height={40} />
          <div>
            <div className="brand-name">ಸಾಮಗ್ರಿ</div>
            <div className="brand-sub">{user?.name || 'Pooja samagri lists'}</div>
          </div>
        </div>
        {user && (
          <button className="avatar" onClick={() => setProfileOpen(true)} aria-label="Your profile" title={`${user.name} · ${user.place}`}>
            {user.name.trim().charAt(0)}
          </button>
        )}
        <nav className="tabs" aria-label="Main">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size={18} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main>
        {loadError ? (
          <div className="page">
            <div className="empty big">
              <div className="empty-mark">!</div>
              <p>{loadError}</p>
              <button className="btn btn-primary" onClick={load}>
                Try again
              </button>
            </div>
          </div>
        ) : loading && tab !== 'dash' ? (
          <div className="page">
            <div className="loading-block">
              <span className="spinner dark" /> Loading…
            </div>
          </div>
        ) : tab === 'home' ? (
          <Home items={items} functions={functions} draft={draft} setDraft={setDraft} onSaved={onSaved} />
        ) : tab === 'dash' ? (
          <Dashboard
            lists={lists}
            loading={loading}
            highlight={highlight}
            onShare={setSharing}
            onEdit={(l) => {
              setDraft(draftFromList(l, items, true));
              setTab('home');
            }}
            onDuplicate={(l) => {
              setDraft(draftFromList(l, items, false));
              setTab('home');
              toast('Copied into a new list');
            }}
            onDelete={onDelete}
            onNew={() => setTab('home')}
          />
        ) : (
          <Admin functions={functions} setFunctions={setFunctions} items={items} setItems={setItems} settings={settings} setSettings={setSettings} />
        )}
      </main>

      <ShareModal list={sharing} settings={sheetSettings} onClose={() => setSharing(null)} />
      {profileOpen && user && (
        <ProfileModal user={user} blessingHint={settings.blessing} onClose={() => setProfileOpen(false)} onSaved={setUser} onSignOut={signOut} />
      )}
    </div>
  );
}

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Loading">
      <div className="splash-glow" aria-hidden="true" />
      <img className="splash-mark" src={logo} alt="" width={104} height={104} />
      <div className="splash-name">ಪೂಜಾ ಸಾಮಗ್ರಿ</div>
      <div className="splash-sub">Preparing your samagri lists</div>
      <div className="splash-thread" aria-hidden="true"><span /></div>
    </div>
  );
}
