'use client';

import { Alert, buttonClass, Spinner } from '@trustedhands/ui';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { RequestCard } from '@/components/request-card';
import { FilterTabs, TabScreen, TabTitle } from '@/components/tab-screen';
import { useRequests } from '@/lib/queries';

export default function RequestsPage() {
  const [scope, setScope] = useState<'active' | 'past'>('active');
  const active = useRequests('active');
  const past = useRequests('past');
  const list = scope === 'active' ? active : past;

  return (
    <TabScreen>
      <TabTitle
        action={
          <Link
            href="/requests/new"
            aria-label="New request"
            className="flex size-11 items-center justify-center rounded-xl bg-cta text-white hover:bg-cta-hover hover:text-white"
          >
            <Plus size={22} aria-hidden="true" />
          </Link>
        }
      >
        My requests
      </TabTitle>
      <FilterTabs
        label="Request filter"
        value={scope}
        onChange={setScope}
        options={[
          { value: 'active', label: active.data ? `Active · ${active.data.length}` : 'Active' },
          { value: 'past', label: 'Past' },
        ]}
      />

      {list.isPending ? (
        <Spinner />
      ) : list.error ? (
        <Alert>We couldn't load your requests. Pull to refresh or try again shortly.</Alert>
      ) : list.data.length === 0 ? (
        <EmptyState scope={scope} />
      ) : (
        <>
          {list.data.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
          {scope === 'active' && (
            <div className="flex justify-between px-1 text-xs text-muted" aria-hidden="true">
              <span>Requested</span>
              <span>Priced</span>
              <span>Paid</span>
              <span>Done</span>
            </div>
          )}
        </>
      )}
    </TabScreen>
  );
}

function EmptyState({ scope }: { scope: 'active' | 'past' }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-white p-5">
      <span className="text-[15px] font-bold">
        {scope === 'active' ? 'No active requests' : 'Nothing here yet'}
      </span>
      <span className="text-sm text-muted">
        {scope === 'active'
          ? "Tell us what you need and we'll find a verified worker and send you a price."
          : 'Completed and cancelled requests will show up here.'}
      </span>
      {scope === 'active' && (
        <Link href="/requests/new" className={buttonClass('primary', 'sm')}>
          New request
        </Link>
      )}
    </div>
  );
}
