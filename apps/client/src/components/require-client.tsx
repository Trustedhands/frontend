'use client';

import { Spinner } from '@trustedhands/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { onboardingStep, useMe } from '@/lib/queries';

/** Renders children only for a signed-in client who has finished sign-up. */
export function RequireClient({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();
  const me = useMe();
  const redirect =
    status === 'anonymous'
      ? `/login?next=${encodeURIComponent(pathname)}`
      : me.data
        ? onboardingStep(me.data)
        : null;

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

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
