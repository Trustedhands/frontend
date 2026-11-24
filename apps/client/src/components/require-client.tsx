'use client';

import { Spinner } from '@trustedhands/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Landing } from '@/components/landing';
import { useAuth } from '@/lib/auth';
import { onboardingStep, useMe } from '@/lib/queries';
import { session } from '@/lib/session';

/**
 * Renders children only for a signed-in client who has finished sign-up.
 * Signed-out visitors to the home page get the public landing page instead.
 */
export function RequireClient({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();
  const me = useMe();
  // Signed out for inactivity: go to login, which says why, even from the home page
  const idle = status === 'anonymous' && session.getState().endReason === 'idle';
  const landing = status === 'anonymous' && pathname === '/' && !idle;
  const redirect = landing
    ? null
    : status === 'anonymous'
      ? `/login?next=${encodeURIComponent(pathname)}${idle ? '&idle=1' : ''}`
      : me.data
        ? onboardingStep(me.data)
        : null;

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  if (landing) return <Landing />;
  if (me.error) {
    return (
      <div className="mx-auto max-w-[600px] p-6 text-sm text-danger" role="alert">
        We couldn't load your account. Check your connection and try again.
      </div>
    );
  }
  if (status !== 'authenticated' || !me.data || redirect) return <Spinner />;
  return <>{children}</>;
}
