'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import type { Session, SessionState, SessionStatus } from './store';

const SERVER_STATE: SessionState = { status: 'loading', accessToken: null, expiresAt: 0 };

/** Restores the session on load and clears cached data when signing out. */
export function SessionProvider({ session, children }: { session: Session; children: ReactNode }) {
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

  return <>{children}</>;
}

export function useSessionStatus(session: Session): SessionStatus {
  return useSyncExternalStore(session.subscribe, session.getState, () => SERVER_STATE).status;
}
