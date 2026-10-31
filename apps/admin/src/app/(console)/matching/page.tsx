'use client';

import { Badge, Spinner } from '@trustedhands/ui';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Empty, ErrorNote, PageHeader, Panel, Table, Td, Th } from '@/components/page';
import { api, unwrap } from '@/lib/api';
import { REQUEST_STATUS } from '@/lib/labels';
import { clientName, requestTitle, requestWhen, workerTag } from '@/lib/requests';

/** Everything waiting on a worker decision: new (price & match) and paid (confirm). */
export default function MatchingPage() {
  const pipeline = useQuery({
    queryKey: ['admin', 'pipeline', '', ''],
    queryFn: () =>
      unwrap(api.GET('/v1/admin/service-requests/pipeline', { params: { query: {} } })),
    refetchInterval: 60_000,
  });
  const rows =
    pipeline.data?.columns
      .filter((c) => c.key === 'NEW' || c.key === 'PAID')
      .flatMap((c) => c.cards)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)) ?? [];

  return (
    <>
      <PageHeader
        title="Matching"
        subtitle="Requests waiting on a worker: price and hold someone for new ones, confirm the held worker once paid."
      />
      {pipeline.error && <ErrorNote error={pipeline.error} />}
      {!pipeline.data ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty>Nothing to match right now.</Empty>
      ) : (
        <Panel className="gap-0 overflow-hidden p-0">
          <Table>
            <thead>
              <tr>
                <Th>Request</Th>
                <Th>Client</Th>
                <Th>When</Th>
                <Th>Worker</Th>
                <Th>Status</Th>
                <Th>
                  <span className="sr-only">Action</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <span className="block font-bold">{requestTitle(r)}</span>
                    <span className="text-[13px] text-muted">
                      #{r.reference} · {r.categoryLabel}
                    </span>
                  </Td>
                  <Td>{clientName(r)}</Td>
                  <Td className="whitespace-nowrap">{requestWhen(r)}</Td>
                  <Td>{workerTag(r) ?? <span className="text-muted">—</span>}</Td>
                  <Td>
                    <Badge tone={REQUEST_STATUS[r.status].tone}>
                      {REQUEST_STATUS[r.status].label}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <Link href={`/requests/${r.id}`} className="font-bold whitespace-nowrap">
                      {r.status === 'PAID' ? 'Confirm worker' : 'Price & match'}
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      )}
    </>
  );
}
