'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { session, type SessionStatus } from './session';

const SERVER_STATE = { status: 'loading' as SessionStatus, accessToken: null, expiresAt: 0 };

/** Restores the session on load and clears cached data when signing out. */
export function AuthProvider({ children }: { children: ReactNode }) {
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
  }, [queryClient]);

  return <>{children}</>;
}

export function useAuth(): { status: SessionStatus } {
  const state = useSyncExternalStore(session.subscribe, session.getState, () => SERVER_STATE);
  return { status: state.status };
}
