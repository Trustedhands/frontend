'use client';

import { Spinner } from '@trustedhands/ui';
import type { Me } from '@trustedhands/api';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useMe } from '@/lib/queries';

/**
 * For sign-up steps 2 and 3: needs a signed-in account, but not a finished
 * sign-up. Passes the loaded account to its render function.
 */
export function RequireProfile({ children }: { children: (me: Me) => ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();
  const me = useMe();

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  if (me.error) {
    return (
      <div className="mx-auto max-w-[600px] p-6 text-sm text-danger" role="alert">
        We couldn't load your account. Check your connection and try again.
      </div>
    );
  }
  if (status !== 'authenticated' || !me.data) return <Spinner />;
  return <>{children(me.data)}</>;
}
