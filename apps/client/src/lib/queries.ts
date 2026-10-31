'use client';

import type { Me } from '@trustedhands/api';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from './api';
import { useAuth } from './auth';

export const keys = {
  me: ['me'] as const,
  requests: (scope: 'active' | 'past') => ['requests', scope] as const,
  request: (id: string) => ['request', id] as const,
  payments: ['payments'] as const,
  tickets: ['tickets'] as const,
  serviceTypes: ['service-types'] as const,
};

export function useMe() {
  const { status } = useAuth();
  return useQuery({
    queryKey: keys.me,
    queryFn: () => unwrap(api.GET('/v1/me')),
    enabled: status === 'authenticated',
  });
}

export function useRequests(scope: 'active' | 'past') {
  return useQuery({
    queryKey: keys.requests(scope),
    queryFn: () => unwrap(api.GET('/v1/service-requests', { params: { query: { scope } } })),
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: keys.request(id),
    queryFn: () => unwrap(api.GET('/v1/service-requests/{id}', { params: { path: { id } } })),
  });
}

export function usePaymentHistory() {
  return useQuery({
    queryKey: keys.payments,
    queryFn: () => unwrap(api.GET('/v1/payments')),
  });
}

/** Where an unfinished sign-up should resume, or null when it's complete. */
export function onboardingStep(me: Me): string | null {
  // Registration creates the profile; the home address is step 2
  if (!me.homeAddress) return '/signup/about';
  return null;
}

export function useTickets() {
  return useQuery({
    queryKey: keys.tickets,
    queryFn: () => unwrap(api.GET('/v1/support/tickets')),
  });
}

/** Services clients can request, as configured by ops. */
export function useServiceTypes() {
  return useQuery({
    queryKey: keys.serviceTypes,
    queryFn: () => unwrap(api.GET('/v1/service-types')),
    staleTime: 10 * 60_000,
  });
}
