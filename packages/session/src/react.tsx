'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { watchIdle } from './idle';
import type { Session, SessionState, SessionStatus } from './store';

const SERVER_STATE: SessionState = { status: 'loading', accessToken: null, expiresAt: 0 };

/**
 * Restores the session on load and clears cached data when signing out.
 * With `idleTimeoutMs`, signs out after that long without activity.
 */
export function SessionProvider({
  session,
  idleTimeoutMs,
  children,
}: {
  session: Session;
  idleTimeoutMs?: number;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (session.getState().status === 'loading') void session.refresh();
    let previous = session.getState().status;
    return session.subscribe(() => {
      const next = session.getState().status;
      // Never show one user's cached data to the next
      if (previous === 'authenticated' && next === 'anonymous') queryClient.clear();
      previous = next;
    });
  }, [queryClient, session]);

  useEffect(() => {
    if (!idleTimeoutMs) return;
    let previous = session.getState().status;
    let stop: (() => void) | undefined;
    const sync = () => {
      const status = session.getState().status;
      if (status === 'authenticated' && !stop) {
        // Signing in starts a fresh clock; restoring on load keeps the stored one
        stop = watchIdle(session, idleTimeoutMs, { freshSignIn: previous === 'anonymous' });
      } else if (status !== 'authenticated' && stop) {
        stop();
        stop = undefined;
      }
      previous = status;
    };
    sync();
    const unsubscribe = session.subscribe(sync);
    return () => {
      unsubscribe();
      stop?.();
    };
  }, [idleTimeoutMs, session]);

  return <>{children}</>;
}

export function useSessionStatus(session: Session): SessionStatus {
  return useSyncExternalStore(session.subscribe, session.getState, () => SERVER_STATE).status;
}
