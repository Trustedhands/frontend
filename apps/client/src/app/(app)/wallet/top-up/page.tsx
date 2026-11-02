'use client';

import { Alert, Button, Field, Input, cx } from '@trustedhands/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { MomoChip } from '@/components/momo-chip';
import { FlowScreen, PageHeader } from '@/components/screen';
import { api, unwrap } from '@/lib/api';
import { formatNumber, formatRwf } from '@/lib/format';
import { keys, useMe } from '@/lib/queries';
import { normalizeLocalPhone } from '@/lib/validation';

const POLL_MS = 3000;
const MIN = 500;
const MAX = 1_000_000;
const QUICK = [5_000, 10_000, 20_000, 50_000];

export default function TopUpPage() {
  return (
    <Suspense>
      <TopUp />
    </Suspense>
  );
}

function TopUp() {
  const queryClient = useQueryClient();
  const me = useMe().data!;
  const params = useSearchParams();
  // From Review & pay: the shortfall, and where to go afterwards
  const suggested = Number(params.get('amount'));
  const back = params.get('back')?.startsWith('/') ? params.get('back')! : '/wallet';
  const saved = me.paymentMethods[0];
  const [amount, setAmount] = useState(
    Number.isInteger(suggested) && suggested > 0 ? formatNumber(Math.max(suggested, MIN)) : '',
  );
  const [useSaved, setUseSaved] = useState(Boolean(saved));
  const [number, setNumber] = useState(me.phone?.replace(/^\+?250/, '') ?? '');
  const [errors, setErrors] = useState<{ amount?: string; number?: string }>({});
  const [topUpId, setTopUpId] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: (body: { amountRwf: number; msisdn: string }) =>
      unwrap(api.POST('/v1/wallet/top-ups', { body })),
    onSuccess: (t) => {
      queryClient.setQueryData(['top-up', t.id], t);
      setTopUpId(t.id);
    },
  });

  // Polling also makes the API re-check MoMo
  const topUp = useQuery({
    queryKey: ['top-up', topUpId],
    queryFn: () =>
      unwrap(api.GET('/v1/wallet/top-ups/{id}', { params: { path: { id: topUpId! } } })),
    enabled: topUpId !== null,
    refetchInterval: (q) => (q.state.data?.status === 'PENDING' ? POLL_MS : false),
  });
  const status = topUp.data?.status;
  useEffect(() => {
    if (status && status !== 'PENDING')
      void queryClient.invalidateQueries({ queryKey: keys.wallet });
  }, [status, queryClient]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = Number(amount.replace(/[\s,]/g, ''));
    const local = useSaved ? null : normalizeLocalPhone(number);
    const next: typeof errors = {};
    if (!Number.isInteger(value) || value < MIN || value > MAX)
      next.amount = `Enter ${formatNumber(MIN)} to ${formatNumber(MAX)} RWF`;
    if (!useSaved && !local) next.number = 'Enter an MTN number, e.g. 78 123 4567';
    setErrors(next);
    if (Object.keys(next).length) return;
    start.mutate({ amountRwf: value, msisdn: useSaved ? saved!.msisdn : `250${local}` });
  };

  if (status === 'SUCCESSFUL') {
    return (
      <FlowScreen wide className="items-center justify-center text-center">
        <CheckCircle2 size={56} className="text-success" aria-hidden="true" />
        <h1 className="m-0 font-display text-[26px] font-extrabold">Wallet topped up</h1>
        <p className="m-0 text-[15px] text-muted">
          {formatRwf(topUp.data!.amountRwf)} is in your wallet and ready to use.
        </p>
        <Link
          href={back}
          className="inline-flex min-h-12 w-full max-w-[360px] items-center justify-center rounded-[14px] bg-cta text-[15px] font-bold text-white no-underline hover:bg-cta-hover hover:text-white"
        >
          {back === '/wallet' ? 'Back to wallet' : 'Continue to payment'}
        </Link>
      </FlowScreen>
    );
  }

  const pending = status === 'PENDING';
  return (
    <FlowScreen wide className="gap-[18px]">
      <PageHeader backHref={back} title="Top up wallet" />
      {pending ? (
        <section
          role="status"
          className="flex flex-col gap-3 rounded-2xl border-2 border-brand bg-white p-4"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-peach text-cta-hover">
              <Smartphone size={20} aria-hidden="true" />
            </span>
            <span className="text-base font-bold">Approve on your phone</span>
          </div>
          <p className="m-0 text-sm leading-[1.45] text-muted">
            We sent a request for {formatRwf(topUp.data!.amountRwf)} to {topUp.data!.msisdnMasked}.
            Enter your MoMo PIN to approve it. If no prompt appears, open your MoMo menu and look
            for pending approvals.
          </p>
          <span className="flex items-center gap-2 text-[13px] font-semibold text-muted">
            <span
              aria-hidden="true"
              className="size-3.5 animate-spin rounded-full border-2 border-line border-t-brand"
            />
            Waiting for MoMo…
          </span>
        </section>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-[18px]">
          <Field label={<span className="font-bold">Amount (RWF)</span>} error={errors.amount}>
            <Input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 20,000"
              aria-invalid={Boolean(errors.amount) || undefined}
            />
          </Field>
          <div className="-mt-2 flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                aria-pressed={amount === formatNumber(q)}
                onClick={() => setAmount(formatNumber(q))}
                className={cx(
                  'min-h-10 rounded-full px-3.5 text-sm',
                  amount === formatNumber(q)
                    ? 'border-0 bg-ink font-bold text-white'
                    : 'border border-field bg-white font-semibold text-ink',
                )}
              >
                {formatNumber(q)}
              </button>
            ))}
          </div>

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2.5 text-sm font-bold">Pay from</legend>
            {saved && (
              <Option checked={useSaved} onSelect={() => setUseSaved(true)}>
                <MomoChip />
                <span className="flex flex-col">
                  <span className="text-[15px] font-bold">Mobile Money</span>
                  <span className="text-[13px] text-muted">{saved.msisdnMasked}</span>
                </span>
              </Option>
            )}
            <Option checked={!useSaved} onSelect={() => setUseSaved(false)}>
              <MomoChip />
              <span className="text-[15px] font-bold">
                {saved ? 'A different MoMo number' : 'Mobile Money'}
              </span>
            </Option>
            {!useSaved && (
              <Field label="MTN Mobile Money number" error={errors.number} className="mt-1">
                <div className="flex gap-2">
                  <span className="flex h-12 items-center rounded-xl border border-field bg-white px-3 text-[15px] font-semibold">
                    +250
                  </span>
                  <Input
                    type="tel"
                    inputMode="tel"
                    className="min-w-0 flex-1"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="78 123 4567"
                    aria-invalid={Boolean(errors.number) || undefined}
                  />
                </div>
              </Field>
            )}
          </fieldset>

          {status === 'FAILED' && (
            <Alert title="Top-up didn't go through">
              {topUp.data!.failureReason ?? 'MoMo could not complete it.'} Nothing was charged; you
              can try again.
            </Alert>
          )}
          {start.error && <Alert>{start.error.message}</Alert>}

          <div className="mt-auto flex flex-col gap-1.5">
            <Button type="submit" loading={start.isPending}>
              Top up
            </Button>
            <span className="text-center text-[13px] text-muted">
              You&apos;ll approve it with your MoMo PIN.
            </span>
          </div>
        </form>
      )}
    </FlowScreen>
  );
}

function Option({
  checked,
  onSelect,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-center gap-3 rounded-[14px] bg-white px-4 py-3.5',
        checked ? 'border-2 border-ink' : 'border border-field',
      )}
    >
      <input
        type="radio"
        name="payFrom"
        checked={checked}
        onChange={onSelect}
        className="m-0 size-[18px] accent-ink"
      />
      {children}
    </label>
  );
}
