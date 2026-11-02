import { Card } from '@trustedhands/ui';
import type { ServiceRequestDetail } from '@trustedhands/api';
import { describeAreas, describeHomeSize } from '@trustedhands/api/household';
import { DetailList } from '@/components/screen';
import { describePlacement, describeSchedule } from '@/lib/format';
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
          ['When', describeSchedule(request)],
          ...(request.placement
            ? ([['Terms', describePlacement(request.placement)]] as Array<[string, string]>)
            : []),
          ['Where', addressLine(request)],
          ...householdItems(request),
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

/** "Home" and "Focus on" rows, for services that asked about the home. */
export function householdItems(r: ServiceRequestDetail): Array<[string, string]> {
  const h = r.household;
  if (!h) return [];
  const size = describeHomeSize(h);
  return [
    ...(size ? ([['Home', size]] as Array<[string, string]>) : []),
    ...(h.areas.length ? ([['Focus on', describeAreas(h.areas)]] as Array<[string, string]>) : []),
  ];
}
