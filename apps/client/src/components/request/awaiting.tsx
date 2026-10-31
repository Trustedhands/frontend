import { Alert, Card } from '@trustedhands/ui';
import type { ServiceRequestDetail } from '@trustedhands/api';
import { Clock } from 'lucide-react';
import { COPY } from '@/lib/copy';
import { CancelRequest } from './cancel-request';
import { RequestProgress } from './progress';
import { RequestSummary } from './summary';

/** Before a price is ready: submitted, or being revised after an adjustment. */
export function AwaitingPrice({ request }: { request: ServiceRequestDetail }) {
  const adjusting = request.status === 'ADJUSTMENT_REQUESTED';
  return (
    <>
      <RequestProgress status={request.status} />
      <Card className="flex-row items-start gap-3 border-0 bg-sky">
        <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-white text-ink-2">
          <Clock size={20} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-bold">
            {adjusting
              ? "We're revising your price"
              : "We're finding a worker and pricing your job"}
          </span>
          <span className="text-sm leading-[1.45] text-muted">
            {adjusting ? `You asked: "${request.adjustmentNote}". ` : ''}
            {COPY.priceResponse}
          </span>
        </div>
      </Card>
      <RequestSummary request={request} />
      <div className="mt-auto flex flex-col">
        <CancelRequest request={request} />
      </div>
    </>
  );
}

export function Cancelled({ request }: { request: ServiceRequestDetail }) {
  return (
    <>
      <Alert tone="warn" title="This request was cancelled">
        {request.cancellationReason ?? 'No reason was given.'}
      </Alert>
      <RequestSummary request={request} />
    </>
  );
}
