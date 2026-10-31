'use client';

import { Avatar, Badge, buttonClass, Input, Spinner, cx } from '@trustedhands/ui';
import type { WorkerStatus } from '@trustedhands/api';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Empty, ErrorNote, PageHeader } from '@/components/page';
import { api, unwrap } from '@/lib/api';
import { WORKER_STATUS } from '@/lib/labels';
import { useCan } from '@/lib/staff';

const FILTERS: Array<{ value: WorkerStatus | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'PENDING_VERIFICATION', label: 'To verify' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'DECLINED', label: 'Declined' },
];

export default function WorkersPage() {
  const can = useCan();
  const [status, setStatus] = useState<WorkerStatus | ''>('');
  const [q, setQ] = useState('');
  const services = useQuery({
    queryKey: ['admin', 'service-types'],
    queryFn: () => unwrap(api.GET('/v1/admin/settings/service-types')),
  });
  const workers = useQuery({
    queryKey: ['admin', 'workers', status, q],
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/workers', {
          params: {
            query: { status: status || undefined, q: q.trim() || undefined, includeInactive: true },
          },
        }),
      ),
  });
  const label = (key: string) => services.data?.find((s) => s.key === key)?.label ?? key;

  return (
    <>
      <PageHeader
        title="Workers"
        subtitle="Select a worker to review their details and verify them."
        actions={
          can('workers.manage') && (
            <Link href="/workers/new" className={buttonClass('primary', 'sm', 'h-11')}>
              <Plus size={18} aria-hidden="true" />
              Add worker
            </Link>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Worker status" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={status === f.value}
              onClick={() => setStatus(f.value)}
              className={cx(
                'min-h-10 rounded-full px-3.5 text-sm',
                status === f.value
                  ? 'border-0 bg-ink font-bold text-white'
                  : 'border border-field bg-white font-semibold text-ink',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Input
          className="h-10 max-w-[280px] rounded-xl text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or phone"
          type="search"
        />
      </div>
      {workers.error && <ErrorNote error={workers.error} />}
      {!workers.data ? (
        <Spinner />
      ) : workers.data.length === 0 ? (
        <Empty>No workers here yet.</Empty>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-3">
          {workers.data.map((w) => (
            <Link
              key={w.id}
              href={`/workers/${w.id}`}
              className="flex items-center gap-3.5 rounded-2xl border border-line bg-white p-4 text-ink no-underline hover:border-ink hover:text-ink"
            >
              <Avatar name={w.fullName} size={48} className="font-extrabold" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-bold">{w.fullName}</span>
                <span className="truncate text-[13px] text-muted">
                  {[
                    w.categories.map(label).join(', '),
                    [w.sector, w.district].filter(Boolean).join(', '),
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Profile incomplete'}
                </span>
                {!w.active && <span className="text-xs font-bold text-danger">Deactivated</span>}
              </span>
              <Badge tone={WORKER_STATUS[w.status].tone} className="flex-none">
                {WORKER_STATUS[w.status].label}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
