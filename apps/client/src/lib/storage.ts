'use client';

import { useCallback } from 'react';
import { useBrowserValue } from './browser';

/** localStorage that never throws (private mode, blocked storage). */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Not persisting a UI preference is fine
    }
    listeners.forEach((l) => l());
  },
};

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

/** A remembered on/off UI preference, e.g. "install banner dismissed". */
export function useStoredFlag(key: string, serverValue = false): [boolean, (on: boolean) => void] {
  const value = useBrowserValue(() => safeStorage.get(key) === '1', serverValue, subscribe);
  const set = useCallback((on: boolean) => safeStorage.set(key, on ? '1' : '0'), [key]);
  return [value, set];
}
