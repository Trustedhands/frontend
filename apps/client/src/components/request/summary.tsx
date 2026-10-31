import { Card } from '@trustedhands/ui';
import type { ServiceRequestDetail } from '@trustedhands/api';
import { DetailList } from '@/components/screen';
import { formatWhen } from '@/lib/format';
import { describeWorkerPreference } from '@/lib/labels';

export function addressLine(r: ServiceRequestDetail) {
  return `${r.address.street}, ${r.address.sector}`;
}

/** Title, reference and the key facts of a request. */
export function RequestSummary({ request }: { request: ServiceRequestDetail }) {
  return (
    <Card className="rounded-[18px]">
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-[19px] font-bold">{request.categoryLabel}</span>
        <span className="text-[13px] text-muted">Request #{request.reference}</span>
      </div>
      <DetailList
        items={[
          ['When', formatWhen(request.scheduledAt, request.durationHours)],
          ['Where', addressLine(request)],
          ['Worker', describeWorkerPreference(request.preferredGender, request.preferredLanguages)],
          [
            'Notes',
            <span key="notes" className="whitespace-pre-line">
              {request.description}
            </span>,
          ],
        ]}
      />
    </Card>
  );
}
