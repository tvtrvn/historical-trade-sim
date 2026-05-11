/**
 * Stable per-browser identifier. Generated on first load, persisted in
 * localStorage. v1 has no auth — the backend uses this to scope scenarios.
 */

const STORAGE_KEY = 'hts.clientId';

function uuidv4(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getClientId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = uuidv4();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
