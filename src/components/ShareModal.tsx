import { useRef, useState } from 'react';
import Sheet from './Sheet';
import { Icon, Modal, useToast } from './ui';
import { downloadPdf, sharePdf, shareText } from '../share';
import type { SavedList, Settings } from '../store';

export default function ShareModal({ list, settings, onClose }: { list: SavedList | null; settings: Settings; onClose: () => void }) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'' | 'pdf' | 'text' | 'dl'>('');
  const toast = useToast();

  if (!list) return null;

  const doPdf = async () => {
    if (!captureRef.current) return;
    setBusy('pdf');
    try {
      const r = await sharePdf(captureRef.current, list);
      if (r === 'downloaded') toast('PDF downloaded');
    } catch (e) {
      console.error(e);
      toast('Could not create PDF', 'err');
    } finally {
      setBusy('');
    }
  };

  const doDownload = async () => {
    if (!captureRef.current) return;
    setBusy('dl');
    try {
      toast(await downloadPdf(captureRef.current, list));
    } catch (e) {
      console.error(e);
      toast('Could not save PDF', 'err');
    } finally {
      setBusy('');
    }
  };

  const doText = async () => {
    setBusy('text');
    try {
      const r = await shareText(list, settings);
      if (r === 'copied') toast('List copied to clipboard');
    } catch {
      toast('Could not share text', 'err');
    } finally {
      setBusy('');
    }
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={`Preview · ${list.poojaName}`}
      footer={
        <>
          <button className="btn btn-quiet" onClick={doText} disabled={!!busy}>
            <Icon name="text" /> {busy === 'text' ? 'Preparing…' : 'Share as text'}
          </button>
          <button className="btn btn-ghost" onClick={doDownload} disabled={!!busy}>
            {busy === 'dl' ? <span className="spinner dark" /> : <Icon name="download" />} {busy === 'dl' ? 'Saving…' : 'Download PDF'}
          </button>
          <button className="btn btn-primary" onClick={doPdf} disabled={!!busy}>
            {busy === 'pdf' ? <span className="spinner" /> : <Icon name="file" />} {busy === 'pdf' ? 'Creating PDF…' : 'Share PDF'}
          </button>
        </>
      }
    >
      <div className="preview-stage">
        <div className="preview-scale">
          <Sheet list={list} settings={settings} />
        </div>
      </div>
      {/* Unscaled copy used for PDF capture */}
      <div className="capture-host" aria-hidden="true">
        <Sheet ref={captureRef} list={list} settings={settings} />
      </div>
    </Modal>
  );
}
