import type { Session } from './store';

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];
/** Record activity at most this often; the timeout is accurate to within it */
const RECORD_EVERY_MS = 10_000;
const CHECK_EVERY_MS = 15_000;

/**
 * Signs the user out after `timeoutMs` without activity. The last activity time
 * is shared between this app's tabs through localStorage, so working in one tab
 * keeps the others signed in. It also survives reloads: coming back to a stale
 * session after the timeout signs out instead of restoring it.
 *
 * Call while the session isn't loading. Returns a cleanup function.
 */
export function watchIdle(session: Session, timeoutMs: number, opts: { freshSignIn: boolean }) {
  const key = `th-last-activity-${session.app}`;
  let lastActivity = Date.now();

  const read = (): number => {
    try {
      const stored = Number(localStorage.getItem(key));
      return Number.isFinite(stored) && stored > 0 ? Math.max(stored, lastActivity) : lastActivity;
    } catch {
      return lastActivity;
    }
  };
  const record = (at: number) => {
    lastActivity = at;
    try {
      localStorage.setItem(key, String(at));
    } catch {
      // Storage blocked: this tab still tracks its own activity
    }
  };

  // A new sign-in starts the clock; a restored session keeps the stored time
  if (opts.freshSignIn) record(Date.now());
  else {
    try {
      const stored = Number(localStorage.getItem(key));
      if (stored > 0) lastActivity = stored;
    } catch {
      // Treat as active now
    }
  }

  let signingOut = false;
  const check = () => {
    if (signingOut || session.getState().status !== 'authenticated') return;
    if (Date.now() - read() >= timeoutMs) {
      signingOut = true;
      void session.signOut('idle');
    }
  };

  const onActivity = () => {
    const now = Date.now();
    // Activity after the deadline (say, waking a laptop) doesn't revive the session
    if (now - read() >= timeoutMs) return check();
    if (now - lastActivity >= RECORD_EVERY_MS) record(now);
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') check();
  };

  check();
  const timer = setInterval(check, CHECK_EVERY_MS);
  for (const e of ACTIVITY_EVENTS)
    window.addEventListener(e, onActivity, { passive: true, capture: true });
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    clearInterval(timer);
    for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, onActivity, { capture: true });
    document.removeEventListener('visibilitychange', onVisible);
  };
}
