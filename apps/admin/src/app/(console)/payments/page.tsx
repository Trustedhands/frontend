'use client';

import { Alert, Badge, Button, Input, Spinner, cx, type BadgeTone } from '@trustedhands/ui';
import {
  formatMonthName,
  formatNumber,
  formatShortDate,
  formatTime,
  kigaliToday,
} from '@trustedhands/ui/format';
import type { PayoutRecord, TransactionRow, WorkerBalance } from '@trustedhands/api';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  Empty,
  ErrorNote,
  PageHeader,
  Panel,
  StatCard,
  Table,
  Tabs,
  Td,
  Th,
} from '@/components/page';
import { api, unwrap } from '@/lib/api';
import { downloadAuthed } from '@/lib/files';
import { useCan } from '@/lib/staff';

type Tab = 'tx' | 'wd' | 'refunds';
const PAGE_SIZE = 25;
const rwf = (n: number) => formatNumber(n);

const PAYMENT_STATUS: Record<
  'PENDING' | 'SUCCESSFUL' | 'FAILED',
  { label: string; tone: BadgeTone }
> = {
  PENDING: { label: 'Processing', tone: 'warn' },
  SUCCESSFUL: { label: 'Paid', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
};

export default function PaymentsPage() {
  const [tab, setTab] = useState<Tab>('tx');
  const [exporting, setExporting] = useState<string | null>(null);
  const overview = useQuery({
    queryKey: ['admin', 'finance', 'overview'],
    queryFn: () => unwrap(api.GET('/v1/admin/finance/overview')),
  });
  const payouts = useQuery({
    queryKey: ['admin', 'finance', 'payouts'],
    queryFn: () => unwrap(api.GET('/v1/admin/finance/payouts')),
  });
  const o = overview.data;
  const toPay = payouts.data?.toPay ?? [];

  const exportCsv = async () => {
    setExporting('');
    try {
      await downloadAuthed(
        '/v1/admin/finance/transactions.csv',
        `trustedhands-transactions-${kigaliToday()}.csv`,
      );
      setExporting(null);
    } catch (err) {
      setExporting((err as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="When a service closes, the payment splits automatically: worker share to their wallet, fee to the platform wallet."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-11"
            loading={exporting === ''}
            onClick={() => void exportCsv()}
          >
            {exporting !== '' && <Download size={16} aria-hidden="true" />}
            Export CSV
          </Button>
        }
      />
      {exporting && <Alert>{exporting}</Alert>}
      {overview.error && <ErrorNote error={overview.error} />}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
        <StatCard
          dark
          label="Platform wallet"
          value={o ? <Money n={o.platformBalanceRwf} /> : '…'}
          note={o && `${rwf(o.feesThisMonthRwf)} RWF fees earned in ${formatMonthName(new Date())}`}
        />
        <StatCard
          label="Held in escrow"
          value={o ? <Money n={o.escrowRwf} /> : '…'}
          note="Paid, service not yet complete"
        />
        <StatCard
          label="Worker wallets"
          value={o ? <Money n={o.workerWalletsRwf} /> : '…'}
          note={
            o && `Across ${o.workersWithBalance} worker${o.workersWithBalance === 1 ? '' : 's'}`
          }
        />
        <StatCard
          label="Withdrawals to process"
          value={payouts.data ? <Money n={toPay.reduce((s, w) => s + w.balanceRwf, 0)} /> : '…'}
          note={`${toPay.length} worker${toPay.length === 1 ? '' : 's'}${o?.payoutsPendingRwf ? ` · ${rwf(o.payoutsPendingRwf)} RWF in flight` : ''}`}
          noteTone={toPay.length ? 'brand' : 'muted'}
        />
      </div>
      <Tabs
        label="Payments"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'tx', label: 'Transactions' },
          { value: 'wd', label: `Withdrawals · ${toPay.length}` },
          { value: 'refunds', label: 'Refunds' },
        ]}
      />
      {tab === 'tx' && <Transactions />}
      {tab === 'wd' && <Withdrawals />}
      {tab === 'refunds' && <Refunds />}
    </>
  );
}

function Money({ n }: { n: number }) {
  return (
    <>
      {rwf(n)} <span className="text-base font-bold">RWF</span>
    </>
  );
}

function txStatus(t: TransactionRow): { label: string; tone: BadgeTone } {
  if (t.refundedRwf >= t.amountRwf) return { label: 'Refunded', tone: 'neutral' };
  if (t.requestCancelled)
    return t.status === 'SETTLED'
      ? { label: `Cancelled · ${rwf(t.feeRwf)} kept`, tone: 'neutral' }
      : { label: 'Cancelled · in escrow', tone: 'warn' };
  if (t.refundedRwf > 0) return { label: `Part refunded ${rwf(t.refundedRwf)}`, tone: 'warn' };
  if (t.status === 'IN_ESCROW') return { label: 'In escrow', tone: 'info' };
  if (t.workerShareRwf === 0) return { label: 'Match fee', tone: 'brand' };
  return { label: 'Split · settled', tone: 'success' };
}

function Transactions() {
  const [page, setPage] = useState(1);
  const tx = useQuery({
    queryKey: ['admin', 'finance', 'transactions', page],
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/finance/transactions', {
          params: { query: { page, pageSize: PAGE_SIZE } },
        }),
      ),
    placeholderData: keepPreviousData,
  });
  if (tx.error) return <ErrorNote error={tx.error} />;
  if (!tx.data) return <Spinner />;
  if (!tx.data.items.length) return <Empty>No payments yet.</Empty>;
  const pages = Math.max(1, Math.ceil(tx.data.total / PAGE_SIZE));
  return (
    <>
      <Panel className="p-0">
        <Table minWidth={820}>
          <thead>
            <tr>
              <Th>Receipt</Th>
              <Th>Client · service</Th>
              <Th className="text-right">Paid</Th>
              <Th className="text-right">Worker</Th>
              <Th className="text-right">Fee</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {tx.data.items.map((t) => {
              const s = txStatus(t);
              return (
                <tr key={t.paymentId}>
                  <Td>
                    <div className="font-bold">#{t.receiptReference}</div>
                    <div className="text-[13px] text-muted">
                      {formatShortDate(t.paidAt)}, {formatTime(t.paidAt)}
                    </div>
                  </Td>
                  <Td>
                    <Link
                      href={`/requests/${t.serviceRequestId}`}
                      className="font-semibold text-ink no-underline"
                    >
                      {t.clientName} · {t.serviceLabel}
                    </Link>
                    <div className="text-[13px] text-muted">{t.serviceRequestReference} · MoMo</div>
                  </Td>
                  <Td className="text-right font-bold">{rwf(t.amountRwf)}</Td>
                  <Td className="text-right">{t.workerShareRwf ? rwf(t.workerShareRwf) : '—'}</Td>
                  <Td className="text-right">{rwf(t.feeRwf)}</Td>
                  <Td>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </Td>
                </tr>
              );
            })}
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

function useFinanceInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin', 'finance'] });
}

function Withdrawals() {
  const can = useCan();
  const payouts = useQuery({
    queryKey: ['admin', 'finance', 'payouts'],
    queryFn: () => unwrap(api.GET('/v1/admin/finance/payouts')),
  });
  if (payouts.error) return <ErrorNote error={payouts.error} />;
  if (!payouts.data) return <Spinner />;
  const { toPay, payouts: history } = payouts.data;
  return (
    <>
      {toPay.length === 0 ? (
        <Empty>No worker has money waiting. Wallets fill up when jobs are released.</Empty>
      ) : (
        <Panel className="p-0">
          <Table minWidth={700}>
            <thead>
              <tr>
                <Th>Worker</Th>
                <Th className="text-right">Amount</Th>
                <Th>Send to</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {toPay.map((w) => (
                <ToPayRow key={w.workerId} w={w} manage={can('payments.manage')} />
              ))}
            </tbody>
          </Table>
        </Panel>
      )}
      <h2 className="m-0 mt-2 font-display text-lg font-bold">Payout history</h2>
      {history.length === 0 ? (
        <Empty>No payouts yet.</Empty>
      ) : (
        <Panel className="p-0">
          <Table minWidth={760}>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Worker</Th>
                <Th className="text-right">Amount</Th>
                <Th>Sent to</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <PayoutRow key={p.id} p={p} manage={can('payments.manage')} />
              ))}
            </tbody>
          </Table>
        </Panel>
      )}
    </>
  );
}

function ToPayRow({ w, manage }: { w: WorkerBalance; manage: boolean }) {
  const invalidate = useFinanceInvalidate();
  const [confirming, setConfirming] = useState(false);
  const pay = useMutation({
    // Pay exactly the amount on screen, even if the balance moved since
    mutationFn: () =>
      unwrap(
        api.POST('/v1/admin/finance/payouts', {
          body: {
            workerId: w.workerId,
            method: w.payoutMethod ?? 'MOMO',
            amountRwf: w.balanceRwf,
          },
        }),
      ),
    onSuccess: async () => {
      setConfirming(false);
      await invalidate();
    },
  });
  return (
    <tr>
      <Td>
        <Link href={`/workers/${w.workerId}`} className="font-bold text-ink no-underline">
          {w.fullName}
        </Link>
      </Td>
      <Td className="text-right font-bold">{rwf(w.balanceRwf)}</Td>
      <Td>{w.destination ?? <span className="text-danger">No payout details</span>}</Td>
      <Td className="text-right">
        {pay.error && (
          <div className="mb-1 text-[13px] text-danger">{(pay.error as Error).message}</div>
        )}
        {manage && w.payoutMethod && !confirming && (
          <Button size="sm" onClick={() => setConfirming(true)}>
            {w.payoutMethod === 'BANK' ? 'Record bank payout' : 'Pay out'}
          </Button>
        )}
        {manage && confirming && (
          <div className="flex flex-col items-end gap-2">
            <span className="text-[13px] text-muted">
              {w.payoutMethod === 'BANK'
                ? `Record ${rwf(w.balanceRwf)} RWF to send by bank?`
                : `Send ${rwf(w.balanceRwf)} RWF to ${w.destination} now?`}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button size="sm" loading={pay.isPending} onClick={() => pay.mutate()}>
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Td>
    </tr>
  );
}

function PayoutRow({ p, manage }: { p: PayoutRecord; manage: boolean }) {
  const invalidate = useFinanceInvalidate();
  const [mode, setMode] = useState<'paid' | 'failed' | null>(null);
  const [text, setText] = useState('');
  const resolve = useMutation({
    mutationFn: () =>
      mode === 'paid'
        ? unwrap(
            api.POST('/v1/admin/finance/payouts/{id}/mark-paid', {
              params: { path: { id: p.id } },
              body: { reference: text.trim() },
            }),
          )
        : unwrap(
            api.POST('/v1/admin/finance/payouts/{id}/mark-failed', {
              params: { path: { id: p.id } },
              body: { reason: text.trim() },
            }),
          ),
    onSuccess: async () => {
      setMode(null);
      setText('');
      await invalidate();
    },
  });
  const s = PAYMENT_STATUS[p.status];
  const bankPending = manage && p.method === 'BANK' && p.status === 'PENDING';
  return (
    <tr>
      <Td>
        {formatShortDate(p.createdAt)}
        <div className="text-[13px] text-muted">by {p.initiatedByName}</div>
      </Td>
      <Td className="font-semibold">{p.workerName}</Td>
      <Td className="text-right font-bold">{rwf(p.amountRwf)}</Td>
      <Td>
        {p.destination}
        {p.manualReference && <div className="text-[13px] text-muted">Ref {p.manualReference}</div>}
      </Td>
      <Td>
        <Badge tone={s.tone}>{s.label}</Badge>
        {p.failureReason && <div className="mt-1 text-[13px] text-danger">{p.failureReason}</div>}
      </Td>
      <Td className="text-right">
        {bankPending && !mode && (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setMode('paid')}>
              Mark paid
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode('failed')}>
              Failed
            </Button>
          </div>
        )}
        {mode && (
          <form
            className="flex flex-wrap justify-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) resolve.mutate();
            }}
          >
            <Input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={mode === 'paid' ? 'Bank reference' : 'What went wrong'}
              aria-label={mode === 'paid' ? 'Bank reference' : 'Failure reason'}
              className="h-9 w-44 rounded-lg text-sm"
            />
            <Button type="submit" size="sm" disabled={!text.trim()} loading={resolve.isPending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
              Cancel
            </Button>
            {resolve.error && (
              <span className="w-full text-[13px] text-danger">
                {(resolve.error as Error).message}
              </span>
            )}
          </form>
        )}
      </Td>
    </tr>
  );
}

function Refunds() {
  const refunds = useQuery({
    queryKey: ['admin', 'finance', 'refunds'],
    queryFn: () => unwrap(api.GET('/v1/admin/finance/refunds')),
  });
  if (refunds.error) return <ErrorNote error={refunds.error} />;
  if (!refunds.data) return <Spinner />;
  if (!refunds.data.length)
    return <Empty>No refunds yet. Issue one from a request or a support ticket.</Empty>;
  return (
    <Panel className="p-0">
      <Table minWidth={820}>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Client · request</Th>
            <Th className="text-right">Amount</Th>
            <Th>Reason</Th>
            <Th>Charged to</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {refunds.data.map((r) => {
            const s = PAYMENT_STATUS[r.status];
            return (
              <tr key={r.id}>
                <Td>
                  {formatShortDate(r.createdAt)}
                  <div className="text-[13px] text-muted">by {r.issuedByName}</div>
                </Td>
                <Td>
                  <Link
                    href={`/requests/${r.serviceRequestId}`}
                    className="font-semibold text-ink no-underline"
                  >
                    {r.clientName} · {r.serviceRequestReference}
                  </Link>
                  <div className="text-[13px] text-muted">
                    {r.destination === 'WALLET' ? 'To their wallet' : `To ${r.msisdnMasked}`}
                  </div>
                </Td>
                <Td className="text-right font-bold">{rwf(r.amountRwf)}</Td>
                <Td className="max-w-[260px]">{r.reason}</Td>
                <Td className={cx(r.chargedTo === 'PLATFORM' && 'font-semibold')}>
                  {r.chargedTo === 'PLATFORM' ? 'Platform wallet' : 'Escrow'}
                </Td>
                <Td>
                  <Badge tone={s.tone}>{s.label}</Badge>
                  {r.failureReason && (
                    <div className="mt-1 text-[13px] text-danger">{r.failureReason}</div>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Panel>
  );
}
