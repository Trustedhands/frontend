'use client';

import { Alert, Spinner } from '@trustedhands/ui';
import type { Transaction } from '@trustedhands/api';
import { ArrowDownLeft, Receipt } from 'lucide-react';
import { useState } from 'react';
import { FilterTabs, TabScreen, TabTitle } from '@/components/tab-screen';
import { formatMonth, formatMonthName, formatNumber, formatShortDate } from '@/lib/format';
import { CATEGORY_LABELS } from '@/lib/labels';
import { usePaymentHistory } from '@/lib/queries';

type Filter = 'ALL' | 'PAYMENT' | 'REFUND';

const STATUS_LABEL: Record<Transaction['status'], string> = {
  SUCCESSFUL: 'Paid',
  PENDING: 'Pending',
  FAILED: 'Failed',
  CREDITED: 'Refund to wallet',
};

export default function PaymentsPage() {
  const history = usePaymentHistory();
  const [filter, setFilter] = useState<Filter>('ALL');

  if (history.isPending) {
    return (
      <TabScreen>
        <TabTitle>Payments</TabTitle>
        <Spinner />
      </TabScreen>
    );
  }
  if (history.error) {
    return (
      <TabScreen>
        <TabTitle>Payments</TabTitle>
        <Alert>We couldn't load your payments. Try again shortly.</Alert>
      </TabScreen>
    );
  }

  const { monthSpentRwf, monthPaymentCount, walletBalanceRwf, transactions } = history.data;
  const shown = transactions.filter((t) => filter === 'ALL' || t.kind === filter);
  const byMonth = groupByMonth(shown);

  return (
    <TabScreen>
      <TabTitle>Payments</TabTitle>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1 rounded-2xl bg-ink p-3.5 text-white">
          <span className="text-[13px] text-mist">Spent in {formatMonthName(new Date())}</span>
          <span className="font-display text-[22px] font-extrabold">
            {formatNumber(monthSpentRwf)}
          </span>
          <span className="text-xs text-mist">
            RWF · {monthPaymentCount} {monthPaymentCount === 1 ? 'payment' : 'payments'}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-3.5">
          <span className="text-[13px] text-muted">Wallet credit</span>
          <span className="font-display text-[22px] font-extrabold">
            {formatNumber(walletBalanceRwf)}
          </span>
          <span className="text-xs text-muted">
            RWF{walletBalanceRwf > 0 ? ' · from refunds' : ''}
          </span>
        </div>
      </div>

      <FilterTabs
        label="Filter"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'ALL', label: 'All' },
          { value: 'PAYMENT', label: 'Payments' },
          { value: 'REFUND', label: 'Refunds' },
        ]}
      />

      {byMonth.length === 0 ? (
        <p className="m-0 rounded-2xl border border-line bg-white p-5 text-sm text-muted">
          {filter === 'REFUND'
            ? 'No refunds.'
            : 'Your payments will show up here after your first booking.'}
        </p>
      ) : (
        byMonth.map(([month, items]) => (
          <section key={month} className="flex flex-col gap-2">
            <h2 className="m-0 text-xs font-bold tracking-[0.08em] text-muted uppercase">
              {month}
            </h2>
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-2xl border border-line bg-white p-0">
              {items.map((t) => (
                <TransactionRow key={`${t.kind}-${t.id}`} tx={t} />
              ))}
            </ul>
          </section>
        ))
      )}
    </TabScreen>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const refund = tx.kind === 'REFUND';
  const Icon = refund ? ArrowDownLeft : Receipt;
  const meta = [
    formatShortDate(tx.at),
    refund ? 'Wallet' : 'MoMo',
    tx.receiptReference ? `#${tx.receiptReference}` : tx.serviceRequestReference,
  ].join(' · ');

  return (
    <li className="flex min-h-11 items-center gap-3 border-b border-divider px-3.5 py-3 last:border-b-0">
      <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-sand text-cta">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-bold">{CATEGORY_LABELS[tx.category]}</span>
        <span className="truncate text-[13px] text-muted">{meta}</span>
      </span>
      <span className="flex flex-col items-end gap-0.5">
        <span
          className={`text-[15px] font-bold ${tx.status === 'FAILED' ? 'text-muted line-through' : ''}`}
        >
          {refund ? '+' : ''}
          {formatNumber(tx.amountRwf)}
        </span>
        <span className={`text-xs ${tx.status === 'FAILED' ? 'text-danger' : 'text-muted'}`}>
          {STATUS_LABEL[tx.status]}
        </span>
      </span>
    </li>
  );
}

function groupByMonth(items: Transaction[]): Array<[string, Transaction[]]> {
  const groups = new Map<string, Transaction[]>();
  for (const t of items) {
    const month = formatMonth(t.at);
    groups.set(month, [...(groups.get(month) ?? []), t]);
  }
  return [...groups.entries()];
}
