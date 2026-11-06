import { useRef } from 'react';
import deity from '/deity.png';
import { api } from '../api';
import { Icon, useToast } from '../components/ui';
import type { Settings } from '../store';

/** Resolve the logo shown at the top of the PDF: default image, custom upload, or none. */
export const pdfLogo = (s: Settings) => (s.logo === 'none' ? '' : !s.logo || s.logo === 'default' ? deity : s.logo);

/** Shrink an uploaded image (keeps transparency) so it stays small in the database. */
function resizeImage(file: File, maxH = 360, maxW = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, maxH / img.height, maxW / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * r);
      c.height = Math.round(img.height * r);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const png = c.toDataURL('image/png');
      // Photos without transparency compress far better as JPEG
      resolve(png.length > 700_000 ? c.toDataURL('image/jpeg', 0.9) : png);
    };
    img.onerror = () => reject(new Error('Could not read this image'));
    img.src = url;
  });
}

export default function LogoPanel({
  settings,
  setSettings,
  run,
  busy,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
  run: (fn: () => Promise<void>, ok?: string) => void;
  busy: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const current = pdfLogo(settings);
  const mode = settings.logo === 'none' ? 'none' : !settings.logo || settings.logo === 'default' ? 'default' : 'custom';

  const save = (logo: string, msg: string) => run(async () => setSettings(await api.saveSettings({ logo })), msg);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('Please choose an image file', 'err');
    try {
      save(await resizeImage(f), 'PDF logo updated');
    } catch (err) {
      toast((err as Error).message, 'err');
    }
  };

  return (
    <div className="panel">
      <h3>PDF logo</h3>
      <p className="muted small">Shown small at the top of page 1. A PNG with a transparent background looks best.</p>
      <div className="logo-preview">{current ? <img src={current} alt="Current PDF logo" /> : <span className="muted small">No logo</span>}</div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onFile} />
      <div className="logo-actions">
        <button type="button" className="btn btn-primary sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Icon name="plus" size={15} /> Upload image
        </button>
        {mode !== 'default' && (
          <button type="button" className="btn btn-ghost sm" disabled={busy} onClick={() => save('default', 'Default logo restored')}>
            <Icon name="reset" size={15} /> Use default
          </button>
        )}
        {mode !== 'none' && (
          <button type="button" className="btn btn-quiet sm" disabled={busy} onClick={() => save('none', 'Logo removed from PDF')}>
            <Icon name="trash" size={15} /> Remove
          </button>
        )}
      </div>
    </div>
  );
}
