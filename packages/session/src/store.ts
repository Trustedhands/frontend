import type { AuthSession } from '@trustedhands/api';

/**
 * The signed-in session. The access token lives only in memory; the refresh
 * token is an httpOnly cookie the API sets, which scripts can't read. On load
 * we exchange that cookie for a fresh access token.
 */
export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

/** Each app has its own refresh cookie, so the client app and admin console never share a session. */
export type SessionApp = 'client' | 'admin';

export interface SessionState {
  status: SessionStatus;
  accessToken: string | null;
  /** Epoch ms when the access token expires */
  expiresAt: number;
}

/** Refresh this long before expiry so requests never carry a stale token */
const REFRESH_MARGIN_MS = 60_000;

const signedOut = (): SessionState => ({ status: 'anonymous', accessToken: null, expiresAt: 0 });

export type Session = ReturnType<typeof createSession>;

export function createSession(options: { apiUrl: string; app: SessionApp }) {
  const query = `?app=${options.app}`;
  let state: SessionState = { status: 'loading', accessToken: null, expiresAt: 0 };
  const listeners = new Set<() => void>();
  let inflight: Promise<string | null> | null = null;

  const update = (next: SessionState) => {
    state = next;
    listeners.forEach((l) => l());
  };

  const exchangeCookie = async (): Promise<string | null> => {
    const res = await fetch(`${options.apiUrl}/v1/auth/refresh${query}`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const body = (await res.json()) as AuthSession;
      session.signIn(body);
      return body.accessToken;
    }
    if (res.status === 401 || res.status === 403) {
      update(signedOut());
      return null;
    }
    throw new Error(`Session refresh failed (${res.status})`);
  };

  const session = {
    /** Pass to auth calls (`params: { query: session.query }`) so they use this app's cookie. */
    query: { app: options.app },

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getState: (): SessionState => state,

    /** Store the session returned by login, register, reset or change password. */
    signIn(auth: AuthSession) {
      update({
        status: 'authenticated',
        accessToken: auth.accessToken,
        expiresAt: Date.now() + auth.expiresIn * 1000,
      });
    },

    async signOut() {
      try {
        await fetch(`${options.apiUrl}/v1/auth/logout${query}`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch {
        // Offline: the cookie stays, but this tab forgets the session
      }
      update(signedOut());
    },

    /**
     * One refresh at a time. The Web Locks API also serialises refreshes across
     * tabs: rotation means a second concurrent refresh with the same cookie
     * would look like token theft and end the session.
     */
    refresh(): Promise<string | null> {
      inflight ??= (async () => {
        try {
          return 'locks' in navigator
            ? await navigator.locks.request(`th-session-refresh-${options.app}`, exchangeCookie)
            : await exchangeCookie();
        } catch {
          // Network trouble: keep a still-valid token; otherwise treat as signed out
          if (state.status !== 'authenticated') update(signedOut());
          return state.accessToken;
        } finally {
          inflight = null;
        }
      })();
      return inflight;
    },

    /** A usable access token, refreshing first if it's missing or about to expire. */
    async getAccessToken(): Promise<string | null> {
      if (state.status === 'anonymous') return null;
      if (state.status === 'loading' || state.expiresAt - Date.now() < REFRESH_MARGIN_MS) {
        return session.refresh();
      }
      return state.accessToken;
    },
  };
  return session;
}
