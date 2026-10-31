'use client';

import { Alert, Spinner } from '@trustedhands/ui';
import { useParams } from 'next/navigation';
import { AwaitingPrice, Cancelled } from '@/components/request/awaiting';
import { ConfirmedService } from '@/components/request/confirmed';
import { ReviewAndPay } from '@/components/request/review-pay';
import { FlowScreen, PageHeader } from '@/components/screen';
import { ApiError } from '@/lib/api';
import { useMe, useRequest } from '@/lib/queries';

export default function RequestPage() {
  const { id } = useParams<{ id: string }>();
  const request = useRequest(id);
  const me = useMe().data!;

  if (request.isPending) {
    return (
      <FlowScreen wide className="gap-[18px]">
        <PageHeader backHref="/requests" title="Request" />
        <Spinner />
      </FlowScreen>
    );
  }
  if (request.error) {
    const missing = request.error instanceof ApiError && request.error.status === 404;
    return (
      <FlowScreen wide className="gap-[18px]">
        <PageHeader backHref="/requests" title="Request" />
        <Alert>
          {missing
            ? "We couldn't find this request."
            : 'Something went wrong loading this request.'}
        </Alert>
      </FlowScreen>
    );
  }

  const r = request.data;
  const title = r.status === 'PRICED' ? 'Review & pay' : r.categoryLabel;

  return (
    <FlowScreen wide className="gap-[18px]">
      <PageHeader backHref="/requests" title={title} />
      {r.status === 'PRICED' ? (
        <ReviewAndPay request={r} me={me} />
      ) : r.status === 'REQUESTED' || r.status === 'ADJUSTMENT_REQUESTED' ? (
        <AwaitingPrice request={r} />
      ) : r.status === 'CANCELLED' ? (
        <Cancelled request={r} />
      ) : (
        <ConfirmedService request={r} />
      )}
    </FlowScreen>
  );
}
