'use client';

import { Badge, Button, Spinner } from '@trustedhands/ui';
import { formatShortDate } from '@trustedhands/ui/format';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Empty, ErrorNote, PageHeader, Panel, Table, Tabs, Td, Th } from '@/components/page';
import { Rating } from '@/components/rating';
import { api, unwrap } from '@/lib/api';
import { REVIEW_TAGS } from '@/lib/labels';

const PAGE_SIZE = 25;
/** Matches the backend's low-rating alert threshold */
const LOW_RATING = 2;

type Filter = 'all' | 'low';

export default function ReviewsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);

  const reviews = useQuery({
    queryKey: ['admin', 'reviews', filter, page],
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/reviews', {
          params: {
            query: {
              maxRating: filter === 'low' ? LOW_RATING : undefined,
              page,
              pageSize: PAGE_SIZE,
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  });
  const pages = reviews.data ? Math.max(1, Math.ceil(reviews.data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle="What clients said after a job, newest first. Open the job to see the full request."
      />
      <Tabs
        label="Filter reviews"
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setPage(1);
        }}
        options={[
          { value: 'all', label: 'All reviews' },
          { value: 'low', label: `Low ratings (${LOW_RATING} or below)` },
        ]}
      />
      {reviews.error && <ErrorNote error={reviews.error} />}
      {!reviews.data ? (
        <Spinner />
      ) : reviews.data.items.length === 0 ? (
        <Empty>{filter === 'low' ? 'No low ratings.' : 'No reviews yet.'}</Empty>
      ) : (
        <Panel className="p-0">
          <Table minWidth={960}>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Rating</Th>
                <Th className="w-[40%]">Feedback</Th>
                <Th>Worker</Th>
                <Th>Client</Th>
                <Th>Job</Th>
              </tr>
            </thead>
            <tbody>
              {reviews.data.items.map((r) => (
                <tr key={r.id} className="align-top hover:bg-paper/60">
                  <Td className="whitespace-nowrap">{formatShortDate(r.createdAt)}</Td>
                  <Td className="whitespace-nowrap">
                    <Rating value={r.rating} />
                  </Td>
                  <Td>
                    {r.tags.length > 0 && (
                      <div className="mb-1.5 flex flex-wrap gap-1">
                        {r.tags.map((t) => (
                          <Badge key={t} tone="neutral">
                            {REVIEW_TAGS[t]}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {r.comment ? (
                      <p className="m-0 whitespace-pre-wrap break-words">“{r.comment}”</p>
                    ) : (
                      r.tags.length === 0 && (
                        <span className="text-[13px] text-muted">No comment</span>
                      )
                    )}
                  </Td>
                  <Td>
                    <Link href={`/workers/${r.workerId}`} className="text-ink">
                      {r.workerName}
                    </Link>
                  </Td>
                  <Td>{r.clientName}</Td>
                  <Td className="whitespace-nowrap">
                    <Link href={`/requests/${r.serviceRequestId}`} className="font-bold text-ink">
                      #{r.serviceRequestReference}
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      )}
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
