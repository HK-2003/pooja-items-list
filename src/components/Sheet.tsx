import { forwardRef } from 'react';
import { pdfLogo } from '../pages/LogoPanel';
import { lineQty, type Entry, type SavedList, type Settings } from '../store';

interface Props {
  list: SavedList;
  settings: Settings;
}

const fmtDate = (d: string) => {
  const dt = new Date(d + 'T00:00:00');
  return isNaN(+dt) ? d : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* Fixed geometry so pages paginate predictably (see .sh-* styles). */
const ROWS_FIRST = 19; // rows per column on page 1 (below the header)
const ROWS_NEXT = 25; // rows per column on continuation pages
const ROW_PX = 38;

interface Page {
  start: number; // index of first entry on this page
  entries: Entry[];
  rows: number; // rows per column available
  notes: boolean;
}

export function paginate(entries: Entry[], notes: string): Page[] {
  const pages: Page[] = [];
  let i = 0;
  do {
    const rows = pages.length === 0 ? ROWS_FIRST : ROWS_NEXT;
    const chunk = entries.slice(i, i + rows * 2);
    pages.push({ start: i, entries: chunk, rows, notes: false });
    i += chunk.length;
  } while (i < entries.length);
  if (notes.trim()) {
    // Rough height of the notes box: ~90 chars per line, 21px per line + 34px padding/margin
    const lines = notes.split('\n').reduce((a, l) => a + Math.max(1, Math.ceil(l.length / 90)), 0);
    const noteRows = Math.ceil((lines * 21 + 34) / ROW_PX);
    const last = pages[pages.length - 1];
    if (last.rows - Math.ceil(last.entries.length / 2) >= noteRows) last.notes = true;
    else pages.push({ start: entries.length, entries: [], rows: ROWS_NEXT, notes: true });
  }
  return pages;
}

/** Printable A4 pages (794 × 1123px = A4 @ 96dpi). Header on page 1 only; list continues on next pages. */
const Sheet = forwardRef<HTMLDivElement, Props>(({ list, settings: s }, ref) => {
  const pages = paginate(list.entries, list.notes);

  return (
    <div className="sheet-doc" ref={ref}>
      {pages.map((pg, pi) => {
        const half = Math.ceil(pg.entries.length / 2);
        const cols = [pg.entries.slice(0, half), pg.entries.slice(half)];
        return (
          <div className={`sheet ${pi > 0 ? 'cont' : ''}`} key={pi}>
            <div className="sh-frame">
              <span className="sh-corner tl" />
              <span className="sh-corner tr" />
              <span className="sh-corner bl" />
              <span className="sh-corner br" />

              {pi === 0 && (
                <header className="sh-head">
                  <div className="sh-top">
                    <div className="sh-priest">
                      <b>{s.priestName}</b>
                      <span>{s.place}</span>
                    </div>
                    <div className="sh-center">
                      {pdfLogo(s) && <img className="sh-deity" src={pdfLogo(s)} alt="" />}
                      <div className="sh-bless">
                        <span className="sh-om">{s.symbol}</span> {s.blessing}
                      </div>
                    </div>
                    <div className="sh-phone">{s.phone && <>✆ {s.phone}</>}</div>
                  </div>

                  <div className="sh-title">
                    <div className="sh-pooja">{list.poojaName}</div>
                    <div className="sh-sub">{s.subtitle}</div>
                  </div>

                  {(list.date || list.place) && (
                    <div className="sh-meta">
                      {list.date && <span>ದಿನಾಂಕ: {fmtDate(list.date)}</span>}
                      {list.date && list.place && <span className="sh-dot">•</span>}
                      {list.place && <span>ಸ್ಥಳ: {list.place}</span>}
                    </div>
                  )}

                  <div className="sh-divider">
                    <span className="sh-line" />
                    <span className="sh-gem">◆</span>
                    <span className="sh-line" />
                  </div>
                </header>
              )}

              <div className="sh-body">
                {cols.map((col, ci) => (
                  <div className="sh-col" key={ci}>
                    {col.map((e, i) => (
                      <div className="sh-item" key={e.itemId + i}>
                        <span className="sh-num">{pg.start + ci * half + i + 1}</span>
                        <span className="sh-name">{e.name}</span>
                        <span className="sh-qty">{lineQty(e.qty, e.unit)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {pg.notes && (
                <div className="sh-notes">
                  <b>ಸೂಚನೆ:</b> {list.notes}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default Sheet;
