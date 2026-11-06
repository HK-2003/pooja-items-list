import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UNITS } from '../store';

/** Text input with a dropdown that always lists every unit; typing a new value filters or allows a custom unit. */
export default function UnitInput({
  value,
  onChange,
  placeholder = 'Unit',
  ariaLabel,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  onEnter?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState({ left: 0, top: 0, width: 0, up: false });

  const q = value.trim().toLowerCase();
  const options = typed && q ? UNITS.filter((u) => u.toLowerCase().includes(q)) : UNITS;

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 260 && r.top > 260;
    setPos({ left: r.left, top: up ? r.top - 6 : r.bottom + 6, width: Math.max(r.width, 150), up });
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      // Scrolling inside the dropdown itself must not close it
      if (e.type === 'scroll' && menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const pick = (u: string) => {
    onChange(u);
    setOpen(false);
    setTyped(false);
  };

  return (
    <>
      <div className="unit-wrap">
        <input
          ref={ref}
          className="unit"
          value={value}
          placeholder={placeholder}
          aria-label={ariaLabel}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          onFocus={() => {
            setOpen(true);
            setTyped(false);
            setActive(UNITS.indexOf(value));
          }}
          onClick={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            onChange(e.target.value);
            setTyped(true);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setOpen(true);
              const d = e.key === 'ArrowDown' ? 1 : -1;
              setActive((a) => (a + d + options.length) % Math.max(options.length, 1));
            } else if (e.key === 'Enter') {
              if (open && active >= 0 && options[active]) {
                e.preventDefault();
                pick(options[active]);
              } else onEnter?.();
            } else if (e.key === 'Escape') setOpen(false);
          }}
        />
        <span className="unit-caret" aria-hidden="true" />
      </div>
      {open &&
        options.length > 0 &&
        createPortal(
          <ul
            ref={menuRef}
            className={`unit-menu ${pos.up ? 'up' : ''}`}
            role="listbox"
            style={{ left: pos.left, top: pos.top, minWidth: pos.width }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {options.map((u, i) => (
              <li
                key={u}
                role="option"
                aria-selected={u === value}
                className={`${i === active ? 'active' : ''} ${u === value ? 'chosen' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(u)}
              >
                {u}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
