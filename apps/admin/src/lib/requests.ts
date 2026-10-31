import type { AdminServiceRequestSummary } from '@trustedhands/api';
import { formatDay, formatTime, shortName } from '@trustedhands/ui/format';

/** Card/list title: the first line of what the client wrote. */
export function requestTitle(r: { description: string; categoryLabel: string }): string {
  const first = r.description.split(/\r?\n/)[0]!.trim();
  if (!first) return r.categoryLabel;
  return first.length > 60 ? `${first.slice(0, 59).trimEnd()}…` : first;
}

/** "Mon 3 Nov, 8:00" for visits; "Starts Mon 3 Nov" for placements */
export function requestWhen(r: Pick<AdminServiceRequestSummary, 'kind' | 'scheduledAt'>): string {
  return r.kind === 'PLACEMENT'
    ? `Starts ${formatDay(r.scheduledAt)}`
    : `${formatDay(r.scheduledAt)}, ${formatTime(r.scheduledAt)}`;
}

/** The worker tag on pipeline cards. */
export function workerTag(r: AdminServiceRequestSummary): string | null {
  if (!r.worker) return r.kind === 'PLACEMENT' ? 'Long-term' : null;
  const name = shortName(r.worker.fullName);
  return r.status === 'PRICED' || r.status === 'PAID' ? `Held: ${name}` : name;
}

export const clientName = (r: AdminServiceRequestSummary) =>
  r.client.companyName ?? r.client.fullName;
