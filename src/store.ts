import { useEffect, useState } from 'react';

export interface Item {
  id: string;
  name: string;
  qty: string;
  unit: string;
}

export interface User {
  id: string;
  name: string;
  place: string;
  phone: string;
  blessing: string;
  existing?: boolean;
}

export interface PoojaFunction {
  id: string;
  name: string;
}

export interface Entry {
  itemId: string;
  name: string;
  qty: string;
  unit: string;
}

export interface SavedList {
  id: string;
  poojaName: string;
  hostName: string;
  date: string;
  place: string;
  notes: string;
  entries: Entry[];
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  symbol: string;
  blessing: string;
  priestName: string;
  place: string;
  phone: string;
  subtitle: string;
  /** 'default' | 'none' | image data URL */
  logo?: string;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const UNITS = [
  'ಕೆ.ಜಿ', 'ಗ್ರಾಂ', 'ಲೀಟರ್', 'ಮಿ.ಲೀ', 'ಪ್ಯಾಕೆಟ್', 'ಬಾಟಲ್', 'ಕುಕ್ಕೆ',
  'ಕಟ್ಟು', 'ಕರಡಿಗೆ', 'ಕುಡ್ತೆ', 'ಗಂಟು', 'ಸೇರು', 'ಜೊತೆ', 'ರೂ', 'ಬೇರೆ ಬೇರೆಯಾಗಿ',
  'kg', 'gm', 'ltr', 'ml', 'pack', 'packet', 'bottle',
];

function load<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignore corrupt storage */
  }
  return fallback();
}

export function usePersisted<T>(key: string, fallback: () => T) {
  const [value, setValue] = useState<T>(() => load(key, fallback));
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}

export const qtyText = (qty: string, unit: string) => [qty, unit].filter(Boolean).join(' ').trim();

/** Units that read as a phrase on their own and print even without a quantity. */
const STANDALONE_UNITS = new Set(['ಬೇರೆ ಬೇರೆಯಾಗಿ']);

/** Text printed after an item name; empty when nothing meaningful was entered. */
export const lineQty = (qty: string, unit: string) =>
  qty.trim() ? qtyText(qty, unit) : STANDALONE_UNITS.has(unit.trim()) ? unit.trim() : '';
