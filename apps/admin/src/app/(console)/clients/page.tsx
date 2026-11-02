'use client';

import { Badge, Button, Input, Spinner } from '@trustedhands/ui';
import { formatNumber, formatShortDate } from '@trustedhands/ui/format';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Empty, ErrorNote, PageHeader, Panel, Table, Td, Th } from '@/components/page';
import { api, unwrap } from '@/lib/api';
import { useCan } from '@/lib/staff';
import { useDebounced } from '@/lib/use-debounced';

const PAGE_SIZE = 25;

export default function ClientsPage() {
  const can = useCan();
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const [page, setPage] = useState(1);

  const clients = useQuery({
    queryKey: ['admin', 'clients', q, page],
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/clients', {
          params: { query: { q: q || undefined, page, pageSize: PAGE_SIZE } },
        }),
      ),
    placeholderData: keepPreviousData,
  });
  const pages = clients.data ? Math.max(1, Math.ceil(clients.data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Everyone who has signed up to book. Open a client to see their requests and wallet."
      />
      <Input
        type="search"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPage(1);
        }}
        placeholder="Search name, email, phone or company"
        aria-label="Search clients"
        className="h-11 max-w-md rounded-[10px] text-sm"
      />
      {clients.error && <ErrorNote error={clients.error} />}
      {!clients.data ? (
        <Spinner />
      ) : clients.data.items.length === 0 ? (
        <Empty>{q ? `No clients match “${q}”.` : 'No clients yet.'}</Empty>
      ) : (
        <Panel className="p-0">
          <Table minWidth={980}>
            <thead>
              <tr>
                <Th>Client</Th>
                <Th>Contact</Th>
                <Th>Type</Th>
                <Th>Verified</Th>
                <Th className="text-right">Requests</Th>
                <Th className="text-right">Wallet (RWF)</Th>
                <Th>Joined</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {clients.data.items.map((c) => (
                <tr key={c.id} className="hover:bg-paper/60">
                  <Td>
                    <Link href={`/clients/${c.id}`} className="font-bold text-ink">
                      {c.companyName ?? c.fullName}
                    </Link>
                    {c.companyName && <div className="text-[13px] text-muted">{c.fullName}</div>}
                  </Td>
                  <Td>
                    <div className="break-all">{c.email}</div>
                    <div className="text-[13px] text-muted">{c.phone ?? 'No phone'}</div>
                  </Td>
                  <Td>{c.accountType === 'COMPANY' ? 'Company' : 'Individual'}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={c.emailVerified ? 'success' : 'neutral'}>Email</Badge>
                      <Badge tone={c.phoneVerified ? 'success' : 'neutral'}>Phone</Badge>
                    </div>
                  </Td>
                  <Td className="text-right font-bold">{c.requestCount}</Td>
                  <Td
                    className={
                      c.walletBalanceRwf > 0 ? 'text-right font-bold' : 'text-right text-muted'
                    }
                  >
                    {formatNumber(c.walletBalanceRwf)}
                  </Td>
                  <Td className="whitespace-nowrap">{formatShortDate(c.createdAt)}</Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/clients/${c.id}`}
                        className="inline-flex min-h-9 items-center rounded-lg border border-field bg-white px-3 text-[13px] font-bold text-ink no-underline"
                      >
                        View
                      </Link>
                      {can('payments.manage') && (
                        <Link
                          href={`/clients/${c.id}?topup=1`}
                          aria-label={`Top up ${c.companyName ?? c.fullName}'s wallet`}
                          className="inline-flex min-h-9 items-center rounded-lg bg-ink px-3 text-[13px] font-bold text-white no-underline hover:text-white"
                        >
                          Top up
                        </Link>
                      )}
                    </div>
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
