'use client';

import { Avatar, Badge, buttonClass, HeroPanel } from '@trustedhands/ui';
import type { ServiceRequestSummary } from '@trustedhands/api';
import { ChevronRight, Download, LifeBuoy, Plus, Wallet, X } from 'lucide-react';
import Link from 'next/link';
import { categoryIcon } from '@/components/category-icon';
import { TabScreen } from '@/components/tab-screen';
import {
  firstName,
  formatDay,
  formatNumber,
  formatRwf,
  formatTime,
  greeting,
  shortName,
} from '@/lib/format';
import { useInstall } from '@/lib/install';
import { STATUS } from '@/lib/labels';
import { useMe, useRequests, useServiceTypes, useWallet } from '@/lib/queries';
import { useStoredFlag } from '@/lib/storage';

const INSTALL_DISMISSED = 'th:install-dismissed';

export default function HomePage() {
  const me = useMe().data!;
  const active = useRequests('active');
  const services = useServiceTypes();
  const priced = active.data?.filter((r) => r.status === 'PRICED') ?? [];
  const upcoming = active.data?.filter((r) => r.status !== 'PRICED') ?? [];
  // Home is a summary; My requests has everything
  const pricedShown = priced.slice(0, 3);
  const morePriced = priced.length - pricedShown.length;

  return (
    <TabScreen wide>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted">{greeting()}</span>
        <span className="font-display text-2xl font-extrabold tracking-[-0.02em] min-[900px]:text-[32px]">
          {firstName(me.profile!.fullName)}
        </span>
      </div>

      <InstallBanner />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
          <HeroPanel className="gap-3.5 min-[900px]:gap-4 min-[900px]:p-7">
            <span className="max-w-[220px] font-display text-[23px] leading-[1.1] font-bold tracking-[-0.02em] min-[900px]:max-w-[420px] min-[900px]:text-[32px]">
              What do you need help with today?
            </span>
            <span className="hidden max-w-[440px] text-[15px] leading-[1.45] text-mist min-[900px]:block">
              Tell us the job and when. We&apos;ll match a verified worker and send you a price to
              confirm.
            </span>
            <Link
              href="/requests/new"
              className={buttonClass('primary', 'md', 'h-[46px] self-start')}
            >
              <Plus size={20} aria-hidden="true" />
              New request
            </Link>
          </HeroPanel>

          <section className="flex flex-col gap-2.5" aria-labelledby="book-heading">
            <h2 id="book-heading" className="m-0 hidden text-lg font-bold min-[900px]:block">
              Book a service
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2.5 min-[900px]:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] min-[900px]:gap-3">
              {(services.data ?? []).map(({ key: category, label }) => {
                const Icon = categoryIcon(category);
                return (
                  <Link
                    key={category}
                    href={`/requests/new?category=${category}`}
                    className="flex min-h-[72px] flex-col gap-2 rounded-[14px] border border-line bg-white p-3 text-[13px] font-semibold text-ink no-underline hover:border-ink hover:text-ink min-[900px]:min-h-[104px] min-[900px]:justify-between min-[900px]:p-4 min-[900px]:text-[15px]"
                  >
                    <Icon size={22} className="text-cta" aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* On phones the prices waiting come first; on large screens they sit in the sidebar */}
          {priced.length > 0 && (
            <div className="flex flex-col gap-2.5 lg:hidden">
              {pricedShown.map((r) => (
                <PriceReadyCard key={r.id} request={r} />
              ))}
              {morePriced > 0 && <MoreLink count={morePriced} />}
            </div>
          )}

          {upcoming.length > 0 && (
            <section className="flex flex-col gap-2.5" aria-labelledby="bookings-heading">
              <div className="flex items-center justify-between">
                <h2 id="bookings-heading" className="m-0 text-lg font-bold">
                  Your bookings
                </h2>
                <Link href="/requests" className="text-sm font-bold">
                  See all
                </Link>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-start gap-2.5 min-[900px]:gap-3">
                {upcoming.slice(0, 6).map((r) => (
                  <UpcomingCard key={r.id} request={r} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4" aria-label="At a glance">
          {priced.length > 0 && (
            <section
              className="hidden flex-col gap-2.5 lg:flex"
              aria-labelledby="attention-heading"
            >
              <h2 id="attention-heading" className="m-0 text-lg font-bold">
                Needs your attention
              </h2>
              {pricedShown.map((r) => (
                <PriceReadyCard key={r.id} request={r} />
              ))}
              {morePriced > 0 && <MoreLink count={morePriced} />}
            </section>
          )}
          <WalletCard />
          <Link
            href="/help"
            className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 text-ink no-underline hover:border-ink hover:text-ink"
          >
            <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-sky">
              <LifeBuoy size={20} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-bold">Need help?</span>
              <span className="text-[13px] text-muted">Report an issue with a booking</span>
            </span>
            <ChevronRight size={18} className="text-muted" aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </TabScreen>
  );
}

/** Balance and a way to top up, once the wallet is switched on (or holds credit). */
function WalletCard() {
  const wallet = useWallet().data;
  if (!wallet || (!wallet.enabled && wallet.balanceRwf === 0)) return null;
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-bold">
          <Wallet size={18} className="text-cta" aria-hidden="true" />
          Wallet
        </span>
        <Link href="/wallet" className="text-[13px] font-bold">
          Activity
        </Link>
      </div>
      <span className="flex items-baseline gap-1.5">
        <span className="font-display text-[26px] leading-none font-extrabold">
          {formatNumber(wallet.balanceRwf)}
        </span>
        <span className="text-[13px] text-muted">RWF available</span>
      </span>
      {wallet.enabled && (
        <Link href="/wallet/top-up" className={buttonClass('outline', 'sm', 'self-start')}>
          <Plus size={16} aria-hidden="true" />
          Top up with MoMo
        </Link>
      )}
    </section>
  );
}

function MoreLink({ count }: { count: number }) {
  return (
    <Link href="/requests" className="text-sm font-bold">
      {count} more {count === 1 ? 'price' : 'prices'} waiting
    </Link>
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
