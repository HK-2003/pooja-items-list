import { useState } from 'react';
import logo from '/logo.png';
import { api, setUserId } from '../api';
import { Icon, Modal, useToast } from '../components/ui';
import type { User } from '../store';

type Form = Omit<User, 'id'>;

function ProfileFields({ f, set, errors, blessingHint }: { f: Form; set: (k: keyof Form, v: string) => void; errors: Partial<Record<keyof Form, string>>; blessingHint: string }) {
  return (
    <>
      <label className={`field ${errors.name ? 'invalid' : ''}`}>
        <span>Your name (ಹೆಸರು) *</span>
        <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="ಉದಾ: ಕಿಶೋರ್ ತಂತ್ರಿ" autoComplete="name" autoFocus />
        {errors.name && <small className="error-text">{errors.name}</small>}
      </label>
      <label className={`field ${errors.place ? 'invalid' : ''}`}>
        <span>Place (ಊರು) *</span>
        <input value={f.place} onChange={(e) => set('place', e.target.value)} placeholder="ಉದಾ: ಮುಜುಂಗಾವು" />
        {errors.place && <small className="error-text">{errors.place}</small>}
      </label>
      <label className={`field ${errors.phone ? 'invalid' : ''}`}>
        <span>Phone *</span>
        <input value={f.phone} onChange={(e) => set('phone', e.target.value.replace(/[^\d+ ]/g, ''))} placeholder="10-digit mobile number" inputMode="tel" autoComplete="tel" maxLength={15} />
        {errors.phone && <small className="error-text">{errors.phone}</small>}
      </label>
      <label className="field">
        <span>Blessing line (optional)</span>
        <input value={f.blessing} onChange={(e) => set('blessing', e.target.value)} placeholder={blessingHint} />
      </label>
    </>
  );
}

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {};
  if (!f.name.trim()) e.name = 'Please enter your name';
  if (!f.place.trim()) e.place = 'Please enter your place';
  if (f.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid 10-digit number';
  return e;
}

/** First-run screen: collects the person's details that print on every PDF. */
export default function Onboarding({ onDone, blessingHint }: { onDone: (u: User) => void; blessingHint: string }) {
  const toast = useToast();
  const [f, setF] = useState<Form>({ name: '', place: '', phone: '', blessing: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Form, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(f);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const u = await api.register(f);
      setUserId(u.id);
      toast(u.existing ? `Welcome back, ${u.name}` : 'Profile saved');
      onDone(u);
    } catch (err) {
      toast((err as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onboard">
      <form className="onboard-card" onSubmit={submit} noValidate>
        <img className="onboard-logo" src={logo} alt="" width={72} height={72} />
        <span className="eyebrow">Welcome</span>
        <h1>Set up your profile</h1>
        <p className="muted">These details print at the top of every samagri list you share.</p>
        <div className="onboard-fields">
          <ProfileFields f={f} set={set} errors={errors} blessingHint={blessingHint} />
        </div>
        <button className="btn btn-primary block" disabled={busy}>
          {busy ? <span className="spinner" /> : <Icon name="check" />} Continue
        </button>
        <p className="muted small">Already registered on another phone? Enter the same phone number to get your saved lists back.</p>
      </form>
    </div>
  );
}

/** Edit profile / switch user, opened from the header. */
export function ProfileModal({ user, onClose, onSaved, onSignOut, blessingHint }: { user: User; onClose: () => void; onSaved: (u: User) => void; onSignOut: () => void; blessingHint: string }) {
  const toast = useToast();
  const [f, setF] = useState<Form>({ name: user.name, place: user.place, phone: user.phone, blessing: user.blessing || '' });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Form, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const save = async () => {
    const errs = validate(f);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      onSaved(await api.updateUser(user.id, f));
      toast('Profile updated');
      onClose();
    } catch (err) {
      toast((err as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Your profile"
      footer={
        <>
          <button className="btn btn-quiet" onClick={onSignOut} style={{ marginRight: 'auto' }}>
            <Icon name="logout" /> Switch user
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="save" />} Save
          </button>
        </>
      }
    >
      <div className="onboard-fields">
        <ProfileFields f={f} set={set} errors={errors} blessingHint={blessingHint} />
      </div>
    </Modal>
  );
}
