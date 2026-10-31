import Link from 'next/link';
import { Avatar, Badge, cx, StepBar } from '@trustedhands/ui';
import type { ServiceRequestSummary } from '@trustedhands/api';
import { formatDay, formatRwf, formatWhen, shortName } from '@/lib/format';
import { STATUS } from '@/lib/labels';

/** Card on "My requests": status, progress bar and what happens next. */
export function RequestCard({ request }: { request: ServiceRequestSummary }) {
  const status = STATUS[request.status];
  const priced = request.status === 'PRICED';
  const awaitingPrice = request.status === 'REQUESTED' || request.status === 'ADJUSTMENT_REQUESTED';

  return (
    <Link
      href={`/requests/${request.id}`}
      className={cx(
        'flex flex-col gap-3 rounded-2xl bg-white p-4 text-ink no-underline hover:text-ink',
        priced ? 'border-2 border-brand' : 'border border-line',
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-bold">{request.categoryLabel}</span>
          <span className="text-[13px] text-muted">
            {awaitingPrice
              ? `${request.reference} · Requested ${formatDay(request.createdAt)}`
              : formatWhen(request.scheduledAt, request.durationHours)}
          </span>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      {request.status !== 'CANCELLED' && (
        <StepBar total={4} done={status.progress} color={status.barColor} thin />
      )}
      <RequestCardFooter request={request} />
    </Link>
  );
}

function RequestCardFooter({ request }: { request: ServiceRequestSummary }) {
  switch (request.status) {
    case 'PRICED':
      return (
        <span className="text-sm font-bold text-cta">
          Review {request.totalRwf !== null ? formatRwf(request.totalRwf) : 'the price'} and pay →
        </span>
      );
    case 'REQUESTED':
      return (
        <span className="text-[13px] text-muted">We're finding a worker and pricing your job.</span>
      );
    case 'ADJUSTMENT_REQUESTED':
      return (
        <span className="text-[13px] text-muted">We're revising the price with your changes.</span>
      );
    case 'PAID':
      return <span className="text-[13px] text-muted">Paid. We're confirming your worker.</span>;
    case 'ASSIGNED':
    case 'IN_PROGRESS':
      return request.worker ? (
        <div className="flex items-center gap-2.5">
          <Avatar name={request.worker.fullName} size={32} />
          <span className="text-sm">
            {shortName(request.worker.fullName)}{' '}
            {request.status === 'ASSIGNED' ? 'is coming' : 'is on the job'}
          </span>
        </div>
      ) : null;
    default:
      return null;
  }
}
