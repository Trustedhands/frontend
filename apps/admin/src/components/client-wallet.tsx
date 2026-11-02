'use client';

import { Alert, Badge, Button, Field, Input, Spinner, cx } from '@trustedhands/ui';
import { formatNumber, formatRwf, formatShortDate, formatTime } from '@trustedhands/ui/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Empty, ErrorNote, Panel, PanelTitle, Table, Td, Th } from '@/components/page';
import { api, unwrap } from '@/lib/api';
import { useCan } from '@/lib/staff';

const MIN = 500;
const MAX = 1_000_000;
const QUICK = [5_000, 10_000, 20_000, 50_000];

export const clientWalletKey = (id: string) => ['admin', 'client', id, 'wallet'] as const;

/** Balance, history and the ops "Top up" for one client. */
export function ClientWalletPanel({
  clientId,
  clientName,
  startOpen = false,
  className,
}: {
  clientId: string;
  clientName: string;
  className?: string;
  /** Open the top-up form straight away (from the clients list) */
  startOpen?: boolean;
}) {
  const can = useCan();
  const wallet = useQuery({
    queryKey: clientWalletKey(clientId),
    queryFn: () =>
      unwrap(api.GET('/v1/admin/clients/{id}/wallet', { params: { path: { id: clientId } } })),
  });
  const canCredit = can('payments.manage');
  const [open, setOpen] = useState(startOpen && canCredit);
  const [done, setDone] = useState<number | null>(null);
  const w = wallet.data;

  return (
    <Panel className={cx('p-0 pt-5', className)}>
      <div className="flex flex-col gap-3 px-5">
        <PanelTitle
          action={
            canCredit &&
            !open && (
              <Button
                size="sm"
                onClick={() => {
                  setDone(null);
                  setOpen(true);
                }}
              >
                <Plus size={16} aria-hidden="true" />
                Top up
              </Button>
            )
          }
        >
          Wallet
        </PanelTitle>
        {wallet.error && <ErrorNote error={wallet.error} />}
        {w && (
          <>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-[34px] leading-none font-extrabold tracking-[-0.02em]">
                {formatNumber(w.balanceRwf)}
              </span>
              <span className="text-sm font-semibold text-muted">RWF available</span>
              {w.pendingTopUps.length > 0 && (
                <Badge tone="warn">
                  {formatRwf(w.pendingTopUps.reduce((s, t) => s + t.amountRwf, 0))} top-up pending
                </Badge>
              )}
            </div>
            {!w.enabled && (
              <p className="m-0 text-[13px] text-muted">
                The client wallet is off in Settings, so {clientName} can&apos;t top up or pay from
                it yet. Credits you add still count.
              </p>
            )}
          </>
        )}
        {done !== null && (
          <Alert tone="success">
            {formatRwf(done)} added to {clientName}&apos;s wallet.
          </Alert>
        )}
        {open && (
          <TopUpForm
            clientId={clientId}
            clientName={clientName}
            onCancel={() => setOpen(false)}
            onDone={(amount) => {
              setOpen(false);
              setDone(amount);
            }}
          />
        )}
      </div>
      {!w ? (
        <div className="p-5">{!wallet.error && <Spinner />}</div>
      ) : w.entries.length === 0 ? (
        <div className="p-5">
          <Empty>No wallet activity yet.</Empty>
        </div>
      ) : (
        <div className="mt-4">
          <Table minWidth={560}>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Activity</Th>
                <Th className="text-right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {w.entries.map((e) => (
                <tr key={e.id}>
                  <Td className="whitespace-nowrap">
                    {formatShortDate(e.at)}
                    <div className="text-[13px] text-muted">{formatTime(e.at)}</div>
                  </Td>
                  <Td>
                    <div className="font-semibold">{e.label}</div>
                    {(e.note || e.createdByName) && (
                      <div className="text-[13px] text-muted">
                        {[e.note, e.createdByName && `by ${e.createdByName}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    )}
                  </Td>
                  <Td
                    className={cx(
                      'text-right font-bold whitespace-nowrap',
                      e.amountRwf > 0 && 'text-success-ink',
                    )}
                  >
                    {e.amountRwf > 0 ? '+' : '−'}
                    {formatNumber(Math.abs(e.amountRwf))}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Panel>
  );
}

/** Amount and reason, then a confirm step, as money changes hands. */
function TopUpForm({
  clientId,
  clientName,
  onCancel,
  onDone,
}: {
  clientId: string;
  clientName: string;
  onCancel: () => void;
  onDone: (amount: number) => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const value = amount.trim() ? Number(amount.replace(/[\s,]/g, '')) : NaN;
  const amountError =
    amount.trim() && !(Number.isInteger(value) && value >= MIN && value <= MAX)
      ? `Whole RWF, ${formatNumber(MIN)} to ${formatNumber(MAX)}`
      : null;
  const valid = !amountError && Number.isInteger(value) && note.trim().length >= 3;

  const credit = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/admin/clients/{id}/wallet/credits', {
          params: { path: { id: clientId } },
          body: { amountRwf: value, note: note.trim() },
        }),
      ),
    onSuccess: async (next) => {
      queryClient.setQueryData(clientWalletKey(clientId), next);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'client', clientId] });
      onDone(value);
    },
  });

  return (
    <form
      className="flex flex-col gap-3.5 rounded-xl border border-line bg-paper p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) setConfirming(true);
      }}
    >
      <p className="m-0 text-[13px] text-muted">
        Record money you received for {clientName} (cash, bank transfer) or a goodwill credit. It
        shows in their wallet straight away and is logged with your name.
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3">
        <Field label="Amount (RWF)" small error={amountError} className="gap-1.5 font-semibold">
          <Input
            inputMode="numeric"
            value={amount}
            disabled={confirming}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 20,000"
            aria-invalid={Boolean(amountError) || undefined}
            className="h-11 rounded-[10px] text-sm"
          />
        </Field>
        <Field label="Reason" small className="gap-1.5 font-semibold">
          <Input
            value={note}
            maxLength={300}
            disabled={confirming}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Cash received at the office"
            className="h-11 rounded-[10px] text-sm"
          />
        </Field>
      </div>
      {!confirming && (
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(formatNumber(q))}
              className="min-h-9 rounded-full border border-field bg-white px-3 text-[13px] font-semibold text-ink"
            >
              {formatNumber(q)}
            </button>
          ))}
        </div>
      )}
      {credit.error && <ErrorNote error={credit.error} />}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-semibold">
            Add {formatRwf(value)} to {clientName}&apos;s wallet?
          </span>
          <Button size="sm" loading={credit.isPending} onClick={() => credit.mutate()}>
            Confirm top-up
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={credit.isPending}
            onClick={() => setConfirming(false)}
          >
            Back
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" size="sm" disabled={!valid}>
            Review
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </form>
  );
}
