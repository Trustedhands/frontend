'use client';

import { SessionProvider, useSessionStatus, type SessionStatus } from '@trustedhands/session';
import type { ReactNode } from 'react';
import { session } from './session';

/** Sign out after 20 minutes without activity */
const IDLE_TIMEOUT_MS = 20 * 60_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider session={session} idleTimeoutMs={IDLE_TIMEOUT_MS}>
      {children}
    </SessionProvider>
  );
}

export function useAuth(): { status: SessionStatus } {
  return { status: useSessionStatus(session) };
}
