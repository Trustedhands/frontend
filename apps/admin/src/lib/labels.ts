import type { BadgeTone } from '@trustedhands/ui';
import type { Language, ServiceRequestStatus, StaffRole, WorkerStatus } from '@trustedhands/api';

/** Ops wording for request statuses (the design's pipeline language). */
export const REQUEST_STATUS: Record<ServiceRequestStatus, { label: string; tone: BadgeTone }> = {
  REQUESTED: { label: 'New', tone: 'info' },
  ADJUSTMENT_REQUESTED: { label: 'Adjustment asked', tone: 'warn' },
  PRICED: { label: 'Awaiting payment', tone: 'warn' },
  PAID: { label: 'Paid', tone: 'success' },
  ASSIGNED: { label: 'Scheduled', tone: 'success' },
  IN_PROGRESS: { label: 'In progress', tone: 'brand' },
  COMPLETED: { label: 'Done', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export const WORKER_STATUS: Record<WorkerStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  PENDING_VERIFICATION: { label: 'Pending verification', tone: 'warn' },
  VERIFIED: { label: 'Verified', tone: 'success' },
  DECLINED: { label: 'Declined', tone: 'danger' },
};

export const STAFF_ROLES: Record<StaffRole, { label: string; can: string }> = {
  SUPER_ADMIN: { label: 'Super admin', can: 'Everything, incl. settings & team' },
  VERIFICATION_LEAD: { label: 'Verification lead', can: 'Create & verify workers' },
  FINANCE: { label: 'Finance', can: 'Payments, refunds, payouts' },
  CUSTOMER_SERVICE: { label: 'Customer service', can: 'Tickets and client contact' },
};

export const LANGUAGE_SHORT: Record<Language, string> = { EN: 'En', FR: 'Fr', RW: 'Rw', SW: 'Sw' };
export const LANGUAGE_LABELS: Record<Language, string> = {
  EN: 'English',
  FR: 'French',
  RW: 'Kinyarwanda',
  SW: 'Swahili',
};
export const LANGUAGE_OPTIONS = (Object.keys(LANGUAGE_LABELS) as Language[]).map((value) => ({
  value,
  label: LANGUAGE_LABELS[value],
}));

/** "Female, Fr" or "Any, En/Fr" (dashboard request rows) */
export function wantsShort(gender: 'ANY' | 'FEMALE' | 'MALE', languages: Language[]): string {
  const g = gender === 'ANY' ? 'Any' : gender === 'FEMALE' ? 'Female' : 'Male';
  return languages.length ? `${g}, ${languages.map((l) => LANGUAGE_SHORT[l]).join('/')}` : g;
}

/** "Female · English" (request detail) */
export function wantsLong(gender: 'ANY' | 'FEMALE' | 'MALE', languages: Language[]): string {
  const g = gender === 'ANY' ? 'Any gender' : gender === 'FEMALE' ? 'Female' : 'Male';
  return [
    g,
    ...(languages.length ? [languages.map((l) => LANGUAGE_LABELS[l]).join(' or ')] : []),
  ].join(' · ');
}
