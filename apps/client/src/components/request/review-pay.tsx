'use client';

import { Alert, Button, Card, cx, Field, Input, TextArea } from '@trustedhands/ui';
import type { Me, Payment, ServiceRequestDetail } from '@trustedhands/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MomoChip } from '@/components/momo-chip';
import { api, unwrap } from '@/lib/api';
import { formatRwf } from '@/lib/format';
import { keys } from '@/lib/queries';
import { normalizeLocalPhone } from '@/lib/validation';
import { CancelRequest } from './cancel-request';
import { RequestProgress } from './progress';
import { RequestSummary } from './summary';

const POLL_MS = 3000;

/** Screen 7: price breakdown, MoMo payment and "ask us to adjust". */
export function ReviewAndPay({ request, me }: { request: ServiceRequestDetail; me: Me }) {
  const queryClient = useQueryClient();
  const quote = request.quote!;
  const saved = me.paymentMethods[0];
  const [useSaved, setUseSaved] = useState(Boolean(saved));
  const [number, setNumber] = useState(me.phone?.replace(/^\+?250/, '') ?? '');
  const [numberError, setNumberError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const refreshAfterPayment = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.request(request.id) }),
      queryClient.invalidateQueries({ queryKey: ['requests'] }),
      queryClient.invalidateQueries({ queryKey: keys.payments }),
      queryClient.invalidateQueries({ queryKey: keys.me }),
    ]);

  const initiate = useMutation({
    mutationFn: (msisdn: string) =>
      unwrap(
        api.POST('/v1/service-requests/{id}/payments', {
          params: { path: { id: request.id } },
          body: { msisdn },
        }),
      ),
    onSuccess: (payment) => {
      queryClient.setQueryData(['payment', payment.id], payment);
      setPaymentId(payment.id);
    },
  });

  // Polling GET /payments/:id also makes the API re-check MoMo
  const payment = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => unwrap(api.GET('/v1/payments/{id}', { params: { path: { id: paymentId! } } })),
    enabled: paymentId !== null,
    refetchInterval: (q) => (q.state.data?.status === 'PENDING' ? POLL_MS : false),
  });

  const status = payment.data?.status;
  useEffect(() => {
    if (status === 'SUCCESSFUL') void refreshAfterPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per status change
  }, [status]);

  const pay = () => {
    if (useSaved && saved) {
      initiate.mutate(saved.msisdn);
      return;
    }
    const local = normalizeLocalPhone(number);
    if (!local) {
      setNumberError('Enter an MTN number, e.g. 78 123 4567');
      return;
    }
    setNumberError(null);
    initiate.mutate(`250${local}`);
  };

  const pending = status === 'PENDING' || (request.hasPendingPayment && !payment.data);
  const failed = status === 'FAILED' ? payment.data! : null;

  return (
    <>
      <RequestProgress status={request.status} />
      <RequestSummary request={request} />

      <Card className="gap-2.5 rounded-[18px]">
        <span className="text-sm font-bold">Price</span>
        <PriceRow label="Worker fee" value={formatRwf(quote.workerFeeRwf)} />
        <PriceRow label="Platform service fee" value={formatRwf(quote.serviceFeeRwf)} />
        {quote.discountRwf > 0 && (
          <PriceRow label="Discount" value={`−${formatRwf(quote.discountRwf)}`} />
        )}
        <div className="h-px bg-line" />
        <div className="flex items-baseline justify-between">
          <span className="font-bold">Total</span>
          <span className="font-display text-[26px] font-extrabold">
            {formatRwf(quote.totalRwf)}
          </span>
        </div>
        <span className="text-[13px] text-muted">
          Charged once when you accept.{quote.note ? ` ${quote.note}` : ''}
        </span>
      </Card>

      {pending ? (
        <PendingPanel
          payment={payment.data}
          amount={quote.totalRwf}
          onCheck={() => {
            // Re-submitting returns the charge already pending, refreshed from MoMo
            const local = normalizeLocalPhone(number);
            const msisdn = saved?.msisdn ?? (local ? `250${local}` : null);
            if (msisdn) initiate.mutate(msisdn);
          }}
          checking={initiate.isPending || payment.isFetching}
        />
      ) : (
        <>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2.5 text-sm font-bold">Pay with</legend>
            {saved && (
              <PayOption checked={useSaved} onSelect={() => setUseSaved(true)}>
                <MomoChip />
                <span className="flex flex-col">
                  <span className="text-[15px] font-bold">Mobile Money</span>
                  <span className="text-[13px] text-muted">{saved.msisdnMasked}</span>
                </span>
              </PayOption>
            )}
            <PayOption checked={!useSaved} onSelect={() => setUseSaved(false)}>
              <MomoChip />
              <span className="text-[15px] font-bold">
                {saved ? 'A different MoMo number' : 'Mobile Money'}
              </span>
            </PayOption>
            {!useSaved && (
              <Field label="MTN Mobile Money number" error={numberError} className="mt-1">
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
                    aria-invalid={Boolean(numberError) || undefined}
                  />
                </div>
              </Field>
            )}
          </fieldset>

          {failed && (
            <Alert title="Payment didn't go through">
              {failed.failureReason ?? 'MoMo could not complete the payment.'} Nothing was charged;
              you can try again.
            </Alert>
          )}
          {initiate.error && <Alert>{initiate.error.message}</Alert>}

          <div className="mt-auto flex flex-col gap-1.5">
            <Button onClick={pay} loading={initiate.isPending}>
              Accept &amp; pay {formatRwf(quote.totalRwf)}
            </Button>
            <AdjustPrice request={request} />
            <CancelRequest request={request} />
          </div>
        </>
      )}
    </>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[15px]">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PayOption({
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
        name="payWith"
        checked={checked}
        onChange={onSelect}
        className="m-0 size-[18px] accent-ink"
      />
      {children}
    </label>
  );
}

function PendingPanel({
  payment,
  amount,
  onCheck,
  checking,
}: {
  payment: Payment | undefined;
  amount: number;
  onCheck: () => void;
  checking: boolean;
}) {
  return (
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
        We sent a request for {formatRwf(amount)}
        {payment ? ` to ${payment.msisdnMasked}` : ''}. Enter your MoMo PIN to approve it. If no
        prompt appears, open your MoMo menu and look for pending approvals.
      </p>
      {payment ? (
        <span className="flex items-center gap-2 text-[13px] font-semibold text-muted">
          <span
            aria-hidden="true"
            className="size-3.5 animate-spin rounded-full border-2 border-line border-t-brand"
          />
          Waiting for MoMo…
        </span>
      ) : (
        <Button variant="outline" size="md" onClick={onCheck} loading={checking}>
          Check payment status
        </Button>
      )}
    </section>
  );
}

function AdjustPrice({ request }: { request: ServiceRequestDetail }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const adjust = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/service-requests/{id}/adjustment', {
          params: { path: { id: request.id } },
          body: { note },
        }),
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.request(request.id), updated);
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-transparent p-3 text-sm font-bold text-cta"
      >
        Not right? Ask us to adjust
      </button>
    );
  }
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
      <Field label="What should change?">
        <TextArea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Only 3 hours needed, the kitchen is already done"
        />
      </Field>
      {adjust.error && <Alert>{adjust.error.message}</Alert>}
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="outline" size="md" onClick={() => setOpen(false)}>
          Never mind
        </Button>
        <Button
          variant="dark"
          size="md"
          disabled={!note.trim()}
          loading={adjust.isPending}
          onClick={() => adjust.mutate()}
        >
          Send to our team
        </Button>
      </div>
    </section>
  );
}
