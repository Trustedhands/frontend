'use client';

import { Alert, Button, Field, Input } from '@trustedhands/ui';
import { formatNumber, formatRwf } from '@trustedhands/ui/format';
import type { AdminServiceRequestDetail } from '@trustedhands/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorNote, Panel } from '@/components/page';
import { api, unwrap } from '@/lib/api';

/** "Issue refund": back to the payer's MoMo number. */
export function RefundPanel({
  request: r,
  ticketId,
  onClose,
}: {
  request: AdminServiceRequestDetail;
  /** The ticket the refund resolves; opens the form straight away */
  ticketId?: string;
  onClose?: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(Boolean(ticketId));
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const refund = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/admin/finance/refunds', {
          body: {
            serviceRequestId: r.id,
            amountRwf: Number(amount.replace(/[\s,]/g, '')),
            reason: reason.trim(),
            ticketId,
          },
        }),
      ),
    onSuccess: () => {
      setAmount('');
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'finance'] });
    },
  });
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start bg-transparent p-0 text-sm font-bold"
      >
        Issue a refund
      </button>
    );
  }
  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-[15px] font-bold">Issue refund · {r.reference}</h2>
        {onClose && (
          <button type="button" onClick={onClose} className="bg-transparent p-0 text-sm font-bold">
            Close
          </button>
        )}
      </div>
      <p className="m-0 text-[13px] text-muted">
        {r.payment?.method === 'WALLET'
          ? 'Credited back to the client’s wallet straight away.'
          : 'Sent back to the payer’s MoMo number.'}{' '}
        Before the worker is paid it comes out of their share first; afterwards the platform covers
        it.
      </p>
      <div className="grid grid-cols-[1fr_2fr] gap-2.5">
        <Field
          label={`Amount (max ${formatNumber(r.payment!.amountRwf)})`}
          small
          className="gap-1.5 font-semibold"
        >
          <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Reason" small className="gap-1.5 font-semibold">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Late arrival"
          />
        </Field>
      </div>
      {refund.error && <ErrorNote error={refund.error} />}
      {refund.data && (
        <Alert tone={refund.data.status === 'FAILED' ? 'danger' : 'success'}>
          {refund.data.status === 'FAILED'
            ? `Refund failed: ${refund.data.failureReason}`
            : refund.data.destination === 'WALLET'
              ? `Refund of ${formatRwf(refund.data.amountRwf)} credited to the client’s wallet.`
              : `Refund of ${formatRwf(refund.data.amountRwf)} sent to ${refund.data.msisdnMasked}. It shows as pending until MoMo confirms.`}
        </Alert>
      )}
      <Button
        size="md"
        disabled={!amount || reason.trim().length < 3}
        loading={refund.isPending}
        onClick={() => refund.mutate()}
      >
        Refund to MoMo
      </Button>
    </Panel>
  );
}
