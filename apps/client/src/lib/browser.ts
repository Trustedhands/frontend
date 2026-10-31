'use client';

import { useSyncExternalStore } from 'react';

type Subscribe = (onChange: () => void) => () => void;

const noSubscribe: Subscribe = () => () => {};

/**
 * Reads a browser-only value without a hydration mismatch: the server (and
 * first client render) use `serverValue`, then React switches to `read()`.
 */
export function useBrowserValue<T>(
  read: () => T,
  serverValue: T,
  subscribe: Subscribe = noSubscribe,
): T {
  return useSyncExternalStore(subscribe, read, () => serverValue);
}
