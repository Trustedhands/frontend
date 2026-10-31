'use client';

import { SessionProvider, useSessionStatus, type SessionStatus } from '@trustedhands/session';
import type { ReactNode } from 'react';
import { session } from './session';

export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}

export function useAuth(): { status: SessionStatus } {
  return { status: useSessionStatus(session) };
}
