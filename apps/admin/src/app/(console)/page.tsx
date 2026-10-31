'use client';

import { Avatar, Badge, buttonClass, Spinner } from '@trustedhands/ui';
import { formatDay, formatNumber, greeting, KIGALI_TZ } from '@trustedhands/ui/format';
import type { AdminServiceRequestSummary } from '@trustedhands/api';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import {
  ErrorNote,
  PageHeader,
  Panel,
  PanelTitle,
  StatCard,
  Table,
  Td,
  Th,
} from '@/components/page';
import { SearchBox } from '@/components/search-box';
import { dashboardKey } from '@/components/shell';
import { api, unwrap } from '@/lib/api';
import { REQUEST_STATUS } from '@/lib/labels';
import { requestWhen } from '@/lib/requests';
import { useCan, useStaff } from '@/lib/staff';

const todayLabel = () =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: KIGALI_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

/** What ops should do next for a request in the "needs action" table. */
function nextAction(r: AdminServiceRequestSummary): string {
  if (r.status === 'PAID') return 'Confirm worker';
  if (r.status === 'PRICED') return 'Remind';
  return 'Price & match';
}

export default function DashboardPage() {
  const me = useStaff();
  const can = useCan();
  const dashboard = useQuery({
    queryKey: dashboardKey,
    queryFn: () => unwrap(api.GET('/v1/admin/dashboard')),
  });
  const services = useQuery({
    queryKey: ['admin', 'service-types'],
    queryFn: () => unwrap(api.GET('/v1/admin/settings/service-types')),
  });
  const serviceLabel = (key: string) => services.data?.find((s) => s.key === key)?.label ?? key;
  const d = dashboard.data;
  const firstName = me.fullName.split(/\s+/)[0];

  return (
    <>
      <PageHeader
        eyebrow={todayLabel()}
        title={`${greeting()}, ${firstName}`}
        actions={
          <>
            <SearchBox />
            {can('workers.manage') && (
              <Link href="/workers/new" className={buttonClass('primary', 'sm', 'h-11')}>
                <Plus size={18} aria-hidden="true" />
                Add worker
              </Link>
            )}
          </>
        }
      />

      {dashboard.error && <ErrorNote error={dashboard.error} />}
      {!d ? (
        <Spinner />
      ) : (
        <>
          <section
            aria-label="Today at a glance"
            className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-3.5"
          >
            <StatCard
              dark
              href="/requests"
              label="New — to price & match"
              value={d.counts.newCount}
              note={
                d.counts.oldestNewWaitingMinutes !== null
                  ? `Oldest waiting ${waited(d.counts.oldestNewWaitingMinutes)}`
                  : 'Nothing waiting'
              }
              noteTone={d.counts.oldestNewWaitingMinutes !== null ? 'brand' : 'muted'}
            />
            <StatCard
              href="/requests"
              label="Priced — awaiting client"
              value={d.counts.pricedCount}
              note="Quotes sent"
            />
            <StatCard
              href="/matching"
              label="Paid — confirm worker"
              value={d.counts.paidCount}
              note="Notify client & brief worker"
            />
            <StatCard
              label="Services today"
              value={d.counts.servicesToday}
              note={`${d.counts.inProgressNow} in progress now`}
            />
            <StatCard
              href={can('tickets.view') ? '/support' : undefined}
              label="Open tickets"
              value={d.counts.openTickets}
              note={d.counts.activeTickets ? `${d.counts.activeTickets} active` : 'None active'}
              noteTone={d.counts.activeTickets ? 'danger' : 'muted'}
            />
          </section>

          <div className="flex flex-wrap items-start gap-5">
            <Panel className="flex-[2_1_560px] gap-0 overflow-hidden p-0">
              <div className="flex items-center justify-between gap-3 px-5 py-[18px]">
                <h2 className="m-0 font-display text-xl font-bold">Requests needing action</h2>
                <Link href="/requests" className="text-sm font-bold whitespace-nowrap">
                  Open pipeline
                </Link>
              </div>
              {d.needsAction.length === 0 ? (
                <p className="m-0 px-5 pb-6 text-sm text-muted">All caught up.</p>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Request</Th>
                      <Th>Client</Th>
                      <Th>When</Th>
                      <Th>Status</Th>
                      <Th>
                        <span className="sr-only">Action</span>
                      </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.needsAction.map((r) => (
                      <tr key={r.id}>
                        <Td>
                          <span className="block font-bold">{r.categoryLabel}</span>
                          <span className="text-[13px] text-muted">
                            #{r.reference} · {r.kind === 'PLACEMENT' ? 'Long-term' : 'Visit'}
                          </span>
                        </Td>
                        <Td>{r.client.companyName ?? r.client.fullName}</Td>
                        <Td className="whitespace-nowrap">{requestWhen(r)}</Td>
                        <Td>
                          <Badge tone={REQUEST_STATUS[r.status].tone} className="whitespace-nowrap">
                            {REQUEST_STATUS[r.status].label}
                          </Badge>
                        </Td>
                        <Td className="text-right">
                          <Link href={`/requests/${r.id}`} className="font-bold whitespace-nowrap">
                            {nextAction(r)}
                          </Link>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>

            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
              {can('workers.view') && (
                <Panel className="gap-1">
                  <h2 className="m-0 mb-2 font-display text-lg font-bold">Workers to verify</h2>
                  {d.workersToVerify.length === 0 ? (
                    <p className="m-0 text-sm text-muted">No one is waiting for verification.</p>
                  ) : (
                    d.workersToVerify.map((w) => (
                      <Link
                        key={w.id}
                        href={`/workers/${w.id}`}
                        className="flex min-h-[52px] items-center gap-3 border-b border-divider text-ink no-underline last:border-b-0 hover:text-ink"
                      >
                        <Avatar name={w.fullName} size={36} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-sm font-bold">{w.fullName}</span>
                          <span className="truncate text-xs text-muted">
                            {w.categories.map(serviceLabel).join(', ') || 'No services'} · added by{' '}
                            {w.createdByName ?? 'unknown'}, {formatDay(w.createdAt)}
                          </span>
                        </span>
                        <span className="text-[13px] font-bold text-cta">Review</span>
                      </Link>
                    ))
                  )}
                </Panel>
              )}
              {d.finance && (
                <Panel>
                  <PanelTitle>Wallets</PanelTitle>
                  <Row
                    label="Platform fees this month"
                    value={`${formatNumber(d.finance.feesThisMonthRwf)} RWF`}
                  />
                  <Row label="Held in escrow" value={`${formatNumber(d.finance.escrowRwf)} RWF`} />
                  <Row
                    label="Owed to workers"
                    value={`${formatNumber(d.finance.workerWalletsRwf)} RWF`}
                  />
                  <Row label="Workers to pay" value={String(d.finance.workersWithBalance)} />
                  <Link href="/payments" className="text-sm font-bold">
                    Go to payments
                  </Link>
                </Panel>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

/** 185 → "3 h", 40 → "40 min", 3000 → "2 days" */
function waited(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 48 * 60) return `${Math.floor(minutes / 60)} h`;
  return `${Math.floor(minutes / 1440)} days`;
}
