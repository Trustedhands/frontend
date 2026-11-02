'use client';

import { Alert, Spinner, cx } from '@trustedhands/ui';
import type { ClientWalletEntry } from '@trustedhands/api';
import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { FlowScreen, PageHeader } from '@/components/screen';
import { formatNumber, formatRwf, formatShortDate } from '@/lib/format';
import { useWallet } from '@/lib/queries';

export default function WalletPage() {
  const wallet = useWallet();
  const w = wallet.data;

  return (
    <FlowScreen wide className="gap-[18px]">
      <PageHeader backHref="/payments" title="Wallet" />
      {wallet.error && <Alert>We couldn&apos;t load your wallet. Try again shortly.</Alert>}
      {!w ? (
        !wallet.error && <Spinner />
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-[20px] bg-ink p-5 text-white">
            <span className="text-[13px] text-mist">Available balance</span>
            <span className="flex items-baseline gap-2">
              <span className="font-display text-[36px] leading-none font-extrabold tracking-[-0.02em]">
                {formatNumber(w.balanceRwf)}
              </span>
              <span className="text-sm text-mist">RWF</span>
            </span>
            <span className="text-[13px] leading-[1.45] text-mist">
              Pay for bookings in one tap, without a MoMo prompt each time. Refunds of wallet
              payments come back here.
            </span>
            {w.enabled ? (
              <Link
                href="/wallet/top-up"
                className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-[14px] bg-cta px-5 text-[15px] font-bold text-white no-underline hover:bg-cta-hover hover:text-white"
              >
                <Plus size={18} aria-hidden="true" />
                Top up with MoMo
              </Link>
            ) : (
              <span className="text-[13px] font-semibold text-mist">
                Top-ups aren&apos;t available right now.
              </span>
            )}
          </section>

          {w.pendingTopUps.map((t) => (
            <Alert key={t.id} tone="warn" title="Top-up waiting for approval">
              {formatRwf(t.amountRwf)} from {t.msisdnMasked}. Approve it in your MoMo menu; it shows
              here once MoMo confirms.
            </Alert>
          ))}

          <h2 className="m-0 mt-1 text-xs font-bold tracking-[0.08em] text-muted uppercase">
            Activity
          </h2>
          {w.entries.length === 0 ? (
            <p className="m-0 rounded-2xl border border-line bg-white p-5 text-sm text-muted">
              Nothing yet. Top-ups, wallet payments and refunds will show up here.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-2xl border border-line bg-white p-0">
              {w.entries.map((e) => (
                <EntryRow key={e.id} entry={e} />
              ))}
            </ul>
          )}
        </>
      )}
    </FlowScreen>
  );
}

function EntryRow({ entry: e }: { entry: ClientWalletEntry }) {
  const credit = e.amountRwf > 0;
  const Icon = credit ? ArrowDownLeft : ArrowUpRight;
  return (
    <li className="flex min-h-11 items-center gap-3 border-b border-divider px-3.5 py-3 last:border-b-0">
      <span
        className={cx(
          'flex size-10 flex-none items-center justify-center rounded-xl',
          credit ? 'bg-success-bg text-success-ink' : 'bg-sand text-cta',
        )}
      >
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-bold">{e.label}</span>
        <span className="truncate text-[13px] text-muted">
          {[formatShortDate(e.at), e.type === 'ADJUSTMENT' ? e.note : null]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      <span className={cx('text-[15px] font-bold', credit && 'text-success-ink')}>
        {credit ? '+' : '−'}
        {formatNumber(Math.abs(e.amountRwf))}
      </span>
    </li>
  );
}
