'use client';

import { Avatar, Badge, buttonClass, HeroPanel } from '@trustedhands/ui';
import type { ServiceRequestSummary } from '@trustedhands/api';
import { Download, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { categoryIcon } from '@/components/category-icon';
import { TabScreen } from '@/components/tab-screen';
import { firstName, formatDay, formatRwf, formatTime, greeting, shortName } from '@/lib/format';
import { useInstall } from '@/lib/install';
import { STATUS } from '@/lib/labels';
import { useMe, useRequests, useServiceTypes } from '@/lib/queries';
import { useStoredFlag } from '@/lib/storage';

const INSTALL_DISMISSED = 'th:install-dismissed';

export default function HomePage() {
  const me = useMe().data!;
  const active = useRequests('active');
  const services = useServiceTypes();
  const priced = active.data?.filter((r) => r.status === 'PRICED') ?? [];
  const upcoming = active.data?.filter((r) => r.status !== 'PRICED') ?? [];

  return (
    <TabScreen wide>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted">{greeting()}</span>
        <span className="font-display text-2xl font-extrabold tracking-[-0.02em]">
          {firstName(me.profile!.fullName)}
        </span>
      </div>

      <InstallBanner />

      <HeroPanel className="gap-3.5">
        <span className="max-w-[220px] font-display text-[23px] leading-[1.1] font-bold tracking-[-0.02em]">
          What do you need help with today?
        </span>
        <Link href="/requests/new" className={buttonClass('primary', 'md', 'h-[46px] self-start')}>
          <Plus size={20} aria-hidden="true" />
          New request
        </Link>
      </HeroPanel>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2.5">
        {(services.data ?? []).map(({ key: category, label }) => {
          const Icon = categoryIcon(category);
          return (
            <Link
              key={category}
              href={`/requests/new?category=${category}`}
              className="flex min-h-[72px] flex-col gap-2 rounded-[14px] border border-line bg-white p-3 text-[13px] font-semibold text-ink no-underline hover:border-ink hover:text-ink"
            >
              <Icon size={22} className="text-cta" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>

      {(priced.length > 0 || upcoming.length > 0) && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-start gap-4">
          {priced.map((r) => (
            <PriceReadyCard key={r.id} request={r} />
          ))}
          {upcoming.map((r) => (
            <UpcomingCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </TabScreen>
  );
}

function InstallBanner() {
  const { standalone } = useInstall();
  // Hidden until the stored preference has been read on the client
  const [dismissed, setDismissed] = useStoredFlag(INSTALL_DISMISSED, true);

  if (standalone || dismissed) return null;
  return (
    <section
      aria-label="Install the app"
      className="flex items-center gap-3 rounded-2xl border border-line bg-white py-3 pr-2 pl-3.5"
    >
      <div className="flex size-10 flex-none items-center justify-center rounded-[10px] bg-brand text-white">
        <Download size={20} aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-bold">Add TrustedHands to your home screen</span>
        <span className="text-[13px] text-muted">Opens like an app. No app store.</span>
      </div>
      <Link href="/install" className={buttonClass('dark', 'sm', 'flex-none px-3.5')}>
        Install
      </Link>
      <button
        type="button"
        aria-label="Dismiss install suggestion"
        onClick={() => setDismissed(true)}
        className="flex size-11 flex-none items-center justify-center rounded-xl border-0 bg-transparent text-muted"
      >
        <X size={20} aria-hidden="true" />
      </button>
    </section>
  );
}

function PriceReadyCard({ request }: { request: ServiceRequestSummary }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-2xl border border-peach-line bg-peach px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold tracking-[0.06em] text-cta-hover uppercase">
          Price ready
        </span>
        <span className="text-[13px] text-cta-hover">
          {request.categoryLabel} · {formatDay(request.scheduledAt)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-[22px] font-extrabold">
          {request.totalRwf !== null && formatRwf(request.totalRwf)}
        </span>
        <Link href={`/requests/${request.id}`} className={buttonClass('dark', 'sm')}>
          Review &amp; pay
        </Link>
      </div>
    </section>
  );
}

function UpcomingCard({ request }: { request: ServiceRequestSummary }) {
  const status = STATUS[request.status];
  const who = request.worker ? ` · ${shortName(request.worker.fullName)}` : '';
  return (
    <Link
      href={`/requests/${request.id}`}
      className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 text-ink no-underline hover:text-ink"
    >
      {request.worker ? (
        <Avatar name={request.worker.fullName} />
      ) : (
        <div className="flex size-11 flex-none items-center justify-center rounded-full bg-sky">
          {(() => {
            const Icon = categoryIcon(request.category);
            return <Icon size={20} aria-hidden="true" />;
          })()}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-bold">{request.categoryLabel}</span>
        <span className="truncate text-[13px] text-muted">
          {formatDay(request.scheduledAt)} · {formatTime(request.scheduledAt)}
          {who}
        </span>
      </div>
      <Badge tone={status.tone}>{status.label}</Badge>
    </Link>
  );
}
