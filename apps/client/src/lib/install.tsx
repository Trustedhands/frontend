'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useBrowserValue } from './browser';

/** Chrome/Edge's install prompt event (not in the TS DOM lib). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Platform = 'ios' | 'android' | 'desktop';

interface InstallState {
  /** Running as an installed app */
  standalone: boolean;
  /** The browser offered a native install prompt we can trigger */
  canPrompt: boolean;
  platform: Platform;
  promptInstall: () => Promise<boolean>;
}

const InstallContext = createContext<InstallState>({
  standalone: false,
  canPrompt: false,
  platform: 'desktop',
  promptInstall: async () => false,
});

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away
  if (/iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1))
    return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

const STANDALONE_QUERY = '(display-mode: standalone)';

function readStandalone(): boolean {
  return (
    window.matchMedia(STANDALONE_QUERY).matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function subscribeStandalone(onChange: () => void) {
  const media = window.matchMedia(STANDALONE_QUERY);
  media.addEventListener('change', onChange);
  window.addEventListener('appinstalled', onChange);
  return () => {
    media.removeEventListener('change', onChange);
    window.removeEventListener('appinstalled', onChange);
  };
}

export function InstallProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const standalone = useBrowserValue(readStandalone, false, subscribeStandalone);
  const platform = useBrowserValue<Platform>(detectPlatform, 'desktop');

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome === 'accepted';
  }, [deferred]);

  return (
    <InstallContext.Provider
      value={{ standalone, canPrompt: deferred !== null, platform, promptInstall }}
    >
      {children}
    </InstallContext.Provider>
  );
}

export const useInstall = () => useContext(InstallContext);
