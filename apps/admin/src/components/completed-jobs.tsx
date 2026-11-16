'use client';

import { Button, Spinner } from '@trustedhands/ui';
import { formatNumber, formatShortDate } from '@trustedhands/ui/format';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Empty, ErrorNote, Panel, Table, Td, Th } from '@/components/page';
import { Rating } from '@/components/rating';
import { api, unwrap } from '@/lib/api';
import { clientName, requestTitle } from '@/lib/requests';

const PAGE_SIZE = 25;

/** Finished jobs, most recently completed first, with the client's rating. */
export function CompletedJobs() {
  const [page, setPage] = useState(1);
  const jobs = useQuery({
    queryKey: ['admin', 'service-requests', 'COMPLETED', page],
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/service-requests', {
          params: { query: { status: 'COMPLETED', page, pageSize: PAGE_SIZE } },
        }),
      ),
    placeholderData: keepPreviousData,
  });
  const pages = jobs.data ? Math.max(1, Math.ceil(jobs.data.total / PAGE_SIZE)) : 1;

  if (jobs.error) return <ErrorNote error={jobs.error} />;
  if (!jobs.data) return <Spinner />;
  if (jobs.data.items.length === 0) return <Empty>No completed jobs yet.</Empty>;

  return (
    <>
      <Panel className="p-0">
        <Table minWidth={900}>
          <thead>
            <tr>
              <Th>Job</Th>
              <Th>Client</Th>
              <Th>Worker</Th>
              <Th>Completed</Th>
              <Th className="text-right">Total (RWF)</Th>
              <Th>Client rating</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {jobs.data.items.map((r) => (
              <tr key={r.id} className="hover:bg-paper/60">
                <Td>
                  <Link href={`/requests/${r.id}`} className="font-bold text-ink">
                    {requestTitle(r)}
                  </Link>
                  <div className="text-[13px] text-muted">
                    #{r.reference} · {r.categoryLabel}
                  </div>
                </Td>
                <Td>{clientName(r)}</Td>
                <Td>
                  {r.worker ? (
                    <Link href={`/workers/${r.worker.id}`} className="text-ink">
                      {r.worker.fullName}
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  {formatShortDate(r.completedAt ?? r.scheduledAt)}
                </Td>
                <Td className="text-right">
                  {r.totalRwf !== null ? formatNumber(r.totalRwf) : '—'}
                </Td>
                <Td>
                  {r.rating !== null ? (
                    <Rating value={r.rating} />
                  ) : (
                    <span className="text-[13px] text-muted">Not rated</span>
                  )}
                </Td>
                <Td>
                  <div className="flex justify-end">
                    <Link
                      href={`/requests/${r.id}`}
                      className="inline-flex min-h-9 items-center rounded-lg border border-field bg-white px-3 text-[13px] font-bold text-ink no-underline"
                    >
                      View
                    </Link>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
      {pages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}
