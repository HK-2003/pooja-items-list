import type { Item, PoojaFunction, SavedList, Settings, User } from './store';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:4000';

let adminPin = sessionStorage.getItem('adminPin') || '';
export const setAdminPin = (pin: string) => {
  adminPin = pin;
  if (pin) sessionStorage.setItem('adminPin', pin);
  else sessionStorage.removeItem('adminPin');
};
export const hasAdminPin = () => !!adminPin;

let userId = localStorage.getItem('userId') || '';
export const getUserId = () => userId;
export const setUserId = (id: string) => {
  userId = id;
  if (id) localStorage.setItem('userId', id);
  else localStorage.removeItem('userId');
};

async function req<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(adminPin ? { 'x-admin-pin': adminPin } : {}), ...(userId ? { 'x-user-id': userId } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach server. Check your connection.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

type ListInput = Omit<SavedList, 'id' | 'createdAt' | 'updatedAt'>;
type ItemInput = Omit<Item, 'id'>;

export const api = {
  settings: () => req<Settings>('/api/settings'),
  saveSettings: (s: Partial<Settings> & { pin?: string }) => req<Settings>('/api/settings', 'PUT', s),
  verifyPin: async (pin: string) => {
    try {
      await req('/api/admin/verify', 'POST', { pin });
      return true;
    } catch {
      return false;
    }
  },
  items: () => req<Item[]>('/api/items'),
  addItem: (i: ItemInput) => req<Item>('/api/items', 'POST', i),
  updateItem: (id: string, i: ItemInput) => req<Item>(`/api/items/${id}`, 'PUT', i),
  deleteItem: (id: string) => req(`/api/items/${id}`, 'DELETE'),
  reorderItems: (ids: string[]) => req<Item[]>('/api/items/reorder', 'POST', { ids }),
  resetItems: () => req<Item[]>('/api/items/reset', 'POST'),
  functions: () => req<PoojaFunction[]>('/api/functions'),
  addFunction: (name: string) => req<PoojaFunction>('/api/functions', 'POST', { name }),
  updateFunction: (id: string, name: string) => req<PoojaFunction>(`/api/functions/${id}`, 'PUT', { name }),
  deleteFunction: (id: string) => req(`/api/functions/${id}`, 'DELETE'),
  reorderFunctions: (ids: string[]) => req<PoojaFunction[]>('/api/functions/reorder', 'POST', { ids }),
  register: (u: Omit<User, 'id'>) => req<User>('/api/users', 'POST', u),
  user: (id: string) => req<User>(`/api/users/${id}`),
  updateUser: (id: string, u: Omit<User, 'id'>) => req<User>(`/api/users/${id}`, 'PUT', u),
  adminUsers: () => req<(User & { lists: number; createdAt: number })[]>('/api/admin/users'),
  lists: () => req<SavedList[]>('/api/lists'),
  createList: (l: ListInput) => req<SavedList>('/api/lists', 'POST', l),
  updateList: (id: string, l: ListInput) => req<SavedList>(`/api/lists/${id}`, 'PUT', l),
  deleteList: (id: string) => req(`/api/lists/${id}`, 'DELETE'),
};
