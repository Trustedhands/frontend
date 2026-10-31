'use client';

import { Select, Spinner } from '@trustedhands/ui';
import type { PipelineColumn } from '@trustedhands/api';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ErrorNote, PageHeader } from '@/components/page';
import { api, unwrap } from '@/lib/api';
import { clientName, requestTitle, requestWhen, workerTag } from '@/lib/requests';

const COLUMNS: Record<PipelineColumn['key'], { name: string; hint: string }> = {
  NEW: { name: 'New', hint: 'Find a worker, set the price' },
  PRICED: { name: 'Priced', hint: 'Quote sent, waiting on client' },
  PAID: { name: 'Paid', hint: 'Confirm worker, notify client' },
  SCHEDULED: { name: 'Scheduled', hint: 'Brief worker before the visit' },
  IN_PROGRESS: { name: 'In progress', hint: 'Closes when client confirms' },
};

export default function RequestsPage() {
  const [category, setCategory] = useState('');
  // Any date by default, so nothing waiting on ops is hidden
  const [days, setDays] = useState('');
  const services = useQuery({
    queryKey: ['admin', 'service-types'],
    queryFn: () => unwrap(api.GET('/v1/admin/settings/service-types')),
  });
  const pipeline = useQuery({
    queryKey: ['admin', 'pipeline', category, days],
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/service-requests/pipeline', {
          params: {
            query: { category: category || undefined, days: days ? Number(days) : undefined },
          },
        }),
      ),
    refetchInterval: 60_000,
  });

  return (
    <>
      <PageHeader
        title="Requests"
        subtitle="Every request moves left to right. Price and hold a worker first, then confirm once the client pays."
        actions={
          <>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Service
              <Select
                className="h-[42px] min-w-[160px] rounded-[10px] text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All services</option>
                {services.data?.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
              Date
              <Select
                className="h-[42px] min-w-[200px] rounded-[10px] text-sm"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              >
                <option value="">Any date</option>
                <option value="7">Within 7 days of today</option>
                <option value="30">Within 30 days of today</option>
              </Select>
            </label>
          </>
        }
      />
      {pipeline.error && <ErrorNote error={pipeline.error} />}
      {!pipeline.data ? (
        <Spinner />
      ) : (
        <div className="relative overflow-x-auto pb-2">
          <div className="grid grid-cols-[repeat(5,minmax(210px,1fr))] items-start gap-3.5">
            {pipeline.data.columns.map((col) => (
              <section
                key={col.key}
                aria-label={COLUMNS[col.key].name}
                className="flex flex-col gap-2.5 rounded-2xl bg-sand p-3"
              >
                <div className="flex items-center justify-between px-1 pt-1">
                  <h2 className="m-0 text-sm font-bold">{COLUMNS[col.key].name}</h2>
                  <span className="rounded-[10px] bg-white px-2 py-0.5 text-xs font-bold">
                    {col.count}
                  </span>
                </div>
                <span className="px-1 text-xs text-muted">{COLUMNS[col.key].hint}</span>
                {col.cards.length === 0 && (
                  <span className="rounded-xl border border-dashed border-dash px-3 py-4 text-center text-xs text-muted">
                    Nothing here
                  </span>
                )}
                {col.cards.map((c) => {
                  const tag = workerTag(c);
                  return (
                    <Link
                      key={c.id}
                      href={`/requests/${c.id}`}
                      className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3.5 text-ink no-underline hover:border-ink hover:text-ink"
                    >
                      <span className="text-xs text-muted">
                        #{c.reference} · {c.categoryLabel}
                      </span>
                      <span className="text-[15px] font-bold break-words">{requestTitle(c)}</span>
                      <span className="text-[13px] text-muted">{clientName(c)}</span>
                      <span className="flex items-center gap-1.5 text-[13px]">
                        <CalendarClock size={14} aria-hidden="true" />
                        {requestWhen(c)}
                      </span>
                      {tag && (
                        <span className="self-start rounded-lg bg-sky px-2 py-1 text-xs font-bold text-ink-2">
                          {tag}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {col.count > col.cards.length && (
                  <span className="px-1 text-xs text-muted">
                    +{col.count - col.cards.length} more
                  </span>
                )}
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
