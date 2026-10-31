'use client';

import { Spinner } from '@trustedhands/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { session } from '@/lib/session';
import { StaffProvider, useStaffQuery } from '@/lib/staff';

/** Signed-in staff only; a client account is signed out of the console. */
export function RequireStaff({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();
  const me = useStaffQuery();
  const notStaff = me.error instanceof ApiError && me.error.status === 403;

  useEffect(() => {
    if (status === 'anonymous') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);

  useEffect(() => {
    if (!notStaff) return;
    void session.signOut().then(() => router.replace('/login?denied=1'));
  }, [notStaff, router]);

  if (me.error && !notStaff) {
    return (
      <p role="alert" className="p-10 text-sm text-danger">
        We couldn't load your account. Check your connection and reload.
      </p>
    );
  }
  if (status !== 'authenticated' || !me.data) return <Spinner label="Loading the console" />;
  return <StaffProvider me={me.data}>{children}</StaffProvider>;
}
