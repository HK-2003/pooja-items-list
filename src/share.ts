import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { lineQty, type SavedList, type Settings } from './store';

const safeName = (s: string) => (s || 'samagri').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60);

/** One A4 portrait page (210 × 297 mm) per rendered .sheet page. */
export async function renderPdf(el: HTMLElement): Promise<jsPDF> {
  await document.fonts.ready;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pages = Array.from(el.querySelectorAll<HTMLElement>('.sheet'));
  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], { scale: 2.5, backgroundColor: '#ffffff', useCORS: true, width: 794, height: 1123 });
    if (i > 0) pdf.addPage('a4', 'portrait');
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
  }
  return pdf;
}

export async function sharePdf(el: HTMLElement, list: SavedList) {
  const pdf = await renderPdf(el);
  const fileName = `${safeName(list.poojaName)}.pdf`;
  const title = list.poojaName;

  if (Capacitor.isNativePlatform()) {
    const data = pdf.output('datauristring').split(',')[1];
    const file = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
    await Share.share({ title, files: [file.uri], dialogTitle: 'Share list' });
    return 'shared';
  }

  const blob = pdf.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  pdf.save(fileName);
  return 'downloaded';
}

/** Saves the PDF: Documents folder on phones, browser download on the web. */
export async function downloadPdf(el: HTMLElement, list: SavedList): Promise<string> {
  const pdf = await renderPdf(el);
  const fileName = `${safeName(list.poojaName)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (Capacitor.isNativePlatform()) {
    const data = pdf.output('datauristring').split(',')[1];
    await Filesystem.writeFile({ path: `PoojaSamagri/${fileName}`, data, directory: Directory.Documents, recursive: true });
    return `Saved to Documents/PoojaSamagri/${fileName}`;
  }
  pdf.save(fileName);
  return 'PDF downloaded';
}

export function listAsText(list: SavedList, s: Settings) {
  const lines = [
    s.symbol,
    s.blessing,
    `*${list.poojaName} ${s.subtitle}*`,
    list.date ? `ದಿನಾಂಕ: ${list.date}` : null,
    list.place ? `ಸ್ಥಳ: ${list.place}` : null,
    '',
    ...list.entries.map((e, i) => `${i + 1}. ${e.name}${lineQty(e.qty, e.unit) ? ' - ' + lineQty(e.qty, e.unit) : ''}`),
    list.notes ? `\n${list.notes}` : null,
    '',
    `${s.priestName}, ${s.place}`,
    s.phone ? `📞 ${s.phone}` : null,
  ];
  return lines.filter((l): l is string => l !== null).join('\n');
}

export async function shareText(list: SavedList, s: Settings) {
  const text = listAsText(list, s);
  if (Capacitor.isNativePlatform()) {
    await Share.share({ title: list.poojaName, text });
    return 'shared';
  }
  if (navigator.share) {
    try {
      await navigator.share({ title: list.poojaName, text });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}
