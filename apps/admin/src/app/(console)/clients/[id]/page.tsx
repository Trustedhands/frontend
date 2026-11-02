'use client';

import { Badge, Spinner } from '@trustedhands/ui';
import { formatNumber, formatShortDate } from '@trustedhands/ui/format';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ClientWalletPanel } from '@/components/client-wallet';
import { Empty, ErrorNote, PageHeader, Panel, PanelTitle, Table, Td, Th } from '@/components/page';
import { api, unwrap } from '@/lib/api';
import { REQUEST_STATUS } from '@/lib/labels';
import { requestTitle, requestWhen } from '@/lib/requests';

const KYC = {
  NOT_STARTED: { label: 'Not started', tone: 'neutral' },
  PENDING: { label: 'Pending', tone: 'warn' },
  VERIFIED: { label: 'Verified', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
} as const;

export default function ClientPage() {
  return (
    <Suspense>
      <ClientView />
    </Suspense>
  );
}

function ClientView() {
  const { id } = useParams<{ id: string }>();
  // "Top up" from the clients list opens the form straight away
  const topUp = useSearchParams().get('topup') === '1';
  const client = useQuery({
    queryKey: ['admin', 'client', id],
    queryFn: () => unwrap(api.GET('/v1/admin/clients/{id}', { params: { path: { id } } })),
  });
  const c = client.data;
  if (client.error) return <ErrorNote error={client.error} />;
  if (!c) return <Spinner />;

  return (
    <>
      <PageHeader
        back={{ href: '/clients', label: 'Clients' }}
        title={c.companyName ?? c.fullName}
        badge={c.accountType === 'COMPANY' && <Badge tone="info">Company</Badge>}
        subtitle={`Joined ${formatShortDate(c.createdAt)} · ${c.requestCount} request${c.requestCount === 1 ? '' : 's'}`}
      />
      <div className="flex flex-wrap items-start gap-6">
        <Panel className="flex-[1_1_300px]">
          <PanelTitle>Contact</PanelTitle>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {c.companyName && <Fact k="Contact person" v={c.fullName} />}
            <Fact k="Email" v={`${c.email}${c.emailVerified ? '' : ' (not verified)'}`} />
            <Fact
              k="Phone"
              v={c.phone ? `${c.phone}${c.phoneVerified ? '' : ' (not verified)'}` : null}
            />
            <Fact
              k="Address"
              v={[c.street, c.sector, c.district].filter(Boolean).join(', ') || null}
            />
            <div className="contents">
              <dt className="text-muted">KYC</dt>
              <dd className="m-0">
                <Badge tone={KYC[c.kycStatus].tone}>{KYC[c.kycStatus].label}</Badge>
              </dd>
            </div>
          </dl>
          {c.openTicketCount > 0 && (
            <Link href="/support" className="text-sm font-bold">
              {c.openTicketCount} open ticket{c.openTicketCount === 1 ? '' : 's'}
            </Link>
          )}
        </Panel>
        <ClientWalletPanel
          clientId={c.id}
          clientName={c.companyName ?? c.fullName}
          startOpen={topUp}
          className="flex-[2_1_440px]"
        />
        <Panel className="flex-[1_1_100%] p-0 pt-5">
          <div className="px-5">
            <PanelTitle>Recent requests</PanelTitle>
          </div>
          {c.recentRequests.length === 0 ? (
            <div className="p-5">
              <Empty>No requests yet.</Empty>
            </div>
          ) : (
            <Table minWidth={620}>
              <thead>
                <tr>
                  <Th>Request</Th>
                  <Th>When</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {c.recentRequests.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <Link href={`/requests/${r.id}`} className="font-bold text-ink no-underline">
                        {r.reference} · {requestTitle(r)}
                      </Link>
                      <div className="text-[13px] text-muted">{r.categoryLabel}</div>
                    </Td>
                    <Td>{requestWhen(r)}</Td>
                    <Td>
                      <Badge tone={REQUEST_STATUS[r.status].tone}>
                        {REQUEST_STATUS[r.status].label}
                      </Badge>
                    </Td>
                    <Td className="text-right font-bold">
                      {r.totalRwf != null ? `${formatNumber(r.totalRwf)} RWF` : '—'}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}

function Fact({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="contents">
      <dt className="text-muted">{k}</dt>
      <dd className="m-0 font-semibold break-words">{v ?? '—'}</dd>
    </div>
  );
}
