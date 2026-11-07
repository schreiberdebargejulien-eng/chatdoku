import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/** localStorage that never throws (private mode, quota, blocked storage…). */
const memory = new Map<string, string>();

const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name) ?? memory.get(name) ?? null;
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    memory.set(name, value);
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* storage unavailable: keep in memory */
    }
  },
  removeItem: (name) => {
    memory.delete(name);
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const persistStorage = createJSONStorage(() => safeLocalStorage);

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = safeLocalStorage.getItem(key);
    return raw ? (JSON.parse(raw as string) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    safeLocalStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Asks the browser to keep our data (iOS may evict storage of unused sites). */
export function requestPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }
}
