'use client';

import type { Permission, StaffMe } from '@trustedhands/api';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';
import { api, unwrap } from './api';
import { useAuth } from './auth';

export const meKey = ['admin', 'me'] as const;

/** The signed-in staff member, or a 403 ApiError for non-staff accounts. */
export function useStaffQuery() {
  const { status } = useAuth();
  return useQuery({
    queryKey: meKey,
    queryFn: () => unwrap(api.GET('/v1/admin/me')),
    enabled: status === 'authenticated',
    retry: false,
  });
}

const StaffContext = createContext<StaffMe | null>(null);

export function StaffProvider({ me, children }: { me: StaffMe; children: ReactNode }) {
  return <StaffContext.Provider value={me}>{children}</StaffContext.Provider>;
}

export function useStaff(): StaffMe {
  const me = useContext(StaffContext);
  if (!me) throw new Error('useStaff outside the console');
  return me;
}

/** Hides actions the API would refuse anyway. */
export function useCan(): (permission: Permission) => boolean {
  const me = useStaff();
  return (permission) => me.permissions.includes(permission);
}
