'use client';

import { Alert, Badge, Button, Field, Input, Spinner, TextArea } from '@trustedhands/ui';
import {
  describePlacement,
  formatDay,
  formatRwf,
  formatShortDate,
  formatTime,
} from '@trustedhands/ui/format';
import type { AdminServiceRequestDetail } from '@trustedhands/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCheck } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ErrorNote, PageHeader, Panel, PanelTitle } from '@/components/page';
import { dashboardKey } from '@/components/shell';
import { RefundPanel } from '@/components/refund-panel';
import { SuggestedWorkers } from '@/components/suggested-workers';
import { api, ApiError, unwrap } from '@/lib/api';
import { REQUEST_STATUS, wantsLong } from '@/lib/labels';
import { requestTitle } from '@/lib/requests';
import { useCan } from '@/lib/staff';

const PRICEABLE = ['REQUESTED', 'ADJUSTMENT_REQUESTED', 'PRICED'] as const;
const CANCELLABLE = ['REQUESTED', 'ADJUSTMENT_REQUESTED', 'PRICED', 'PAID', 'ASSIGNED'] as const;

export default function RequestPage() {
  const { id } = useParams<{ id: string }>();
  const can = useCan();
  const request = useQuery({
    queryKey: ['admin', 'request', id],
    queryFn: () => unwrap(api.GET('/v1/admin/service-requests/{id}', { params: { path: { id } } })),
  });
  const r = request.data;
  const [heldChoice, setHeld] = useState<string | null | undefined>(undefined);

  if (request.error) {
    return (
      <>
        <PageHeader back={{ href: '/requests', label: 'All requests' }} title="Request" />
        <ErrorNote
          error={
            request.error instanceof ApiError && request.error.status === 404
              ? new Error('Request not found')
              : request.error
          }
        />
      </>
    );
  }
  if (!r) return <Spinner />;

  const manage = can('requests.manage');
  const status = REQUEST_STATUS[r.status];
  // The worker held on screen until it's saved with the price or confirmation
  const held = heldChoice === undefined ? (r.worker?.id ?? null) : heldChoice;
  return (
    <>
      <PageHeader
        back={{ href: '/requests', label: 'All requests' }}
        title={requestTitle(r)}
        badge={
          <Badge
            tone={status.tone}
            className="px-2.5 py-1.5"
          >{`${status.label} · #${r.reference}`}</Badge>
        }
      />
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-[18px]">
          <RequestFacts request={r} />
          {(PRICEABLE as readonly string[]).includes(r.status) && (
            <PricePanel request={r} manage={manage} held={held} />
          )}
          {r.status === 'PAID' && <ConfirmPanel request={r} manage={manage} held={held} />}
          {(r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS') && manage && (
            <ProgressPanel request={r} />
          )}
          {r.payment && can('payments.manage') && <RefundPanel request={r} />}
          {(CANCELLABLE as readonly string[]).includes(r.status) && manage && (
            <CancelPanel request={r} />
          )}
          <Timeline request={r} />
        </div>
        <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-4">
          {(PRICEABLE as readonly string[]).includes(r.status) || r.status === 'PAID' ? (
            <SuggestedWorkers
              request={r}
              selectedId={held}
              onSelect={setHeld}
              actionLabel={r.status === 'PAID' ? 'Choose' : 'Assign'}
              disabled={!manage}
            />
          ) : (
            <AssignedWorker request={r} />
          )}
        </div>
      </div>
    </>
  );
}

function useInvalidate(id: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'request', id] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'pipeline'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'suggestions', id] }),
      queryClient.invalidateQueries({ queryKey: dashboardKey }),
    ]);
}

// ─── Panels ──────────────────────────────────────────────────────────────

function RequestFacts({ request: r }: { request: AdminServiceRequestDetail }) {
  const end =
    r.durationHours !== null
      ? formatTime(
          new Date(new Date(r.scheduledAt).getTime() + r.durationHours * 3_600_000).toISOString(),
        )
      : null;
  const when =
    r.kind === 'PLACEMENT'
      ? `Starts ${formatDay(r.scheduledAt)}`
      : `${formatDay(r.scheduledAt)}, ${formatTime(r.scheduledAt)}–${end}`;
  const client =
    r.client.accountType === 'COMPANY'
      ? `${r.client.companyName ?? r.client.fullName} (company)`
      : r.client.fullName;
  return (
    <Panel>
      <h2 className="m-0 text-[15px] font-bold">Request</h2>
      <dl className="m-0 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 text-sm">
        <Fact term="Client">
          {client}
          {r.client.kycStatus === 'VERIFIED' ? ' · verified' : ''}
        </Fact>
        <Fact term="Contact">{[r.client.phone, r.client.email].filter(Boolean).join(' · ')}</Fact>
        <Fact term="Service">
          {r.categoryLabel}
          {r.kind === 'PLACEMENT' ? ' · long-term' : ''}
        </Fact>
        <Fact term="When">{when}</Fact>
        {r.placement && <Fact term="Terms">{describePlacement(r.placement)}</Fact>}
        <Fact term="Address">
          {r.address.street}, {r.address.sector}, {r.address.district}
        </Fact>
        <Fact term="Wants">{wantsLong(r.preferredGender, r.preferredLanguages)}</Fact>
      </dl>
      <p className="m-0 rounded-xl bg-paper px-3.5 py-3 text-sm leading-normal whitespace-pre-line">
        “{r.description}”
      </p>
      {r.status === 'ADJUSTMENT_REQUESTED' && r.adjustmentNote && (
        <Alert tone="warn" title="Client asked to adjust">
          {r.adjustmentNote}
        </Alert>
      )}
      {r.cancellationReason && (
        <Alert tone="warn" title="Cancelled">
          {r.cancellationReason}
        </Alert>
      )}
    </Panel>
  );
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{term}</dt>
      <dd className="m-0 font-semibold">{children}</dd>
    </>
  );
}

function PricePanel({
  request: r,
  manage,
  held,
}: {
  request: AdminServiceRequestDetail;
  manage: boolean;
  held: string | null;
}) {
  const invalidate = useInvalidate(r.id);
  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => unwrap(api.GET('/v1/admin/settings')),
  });
  const placement = r.kind === 'PLACEMENT';
  const [fee, setFee] = useState(r.quote && !placement ? String(r.quote.workerFeeRwf) : '');
  const [note, setNote] = useState(r.quote?.note ?? '');
  const workerFee = placement ? 0 : Number(fee.replace(/[\s,]/g, '')) || 0;
  const platformFee = settings.data
    ? placement
      ? settings.data.matchFeeRwf
      : settings.data.serviceFeeRwf
    : null;

  const price = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/admin/service-requests/{id}/price', {
          params: { path: { id: r.id } },
          body: { workerFeeRwf: workerFee, workerId: held!, note: note.trim() || undefined },
        }),
      ),
    onSuccess: invalidate,
  });
  const remind = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/admin/service-requests/{id}/remind', { params: { path: { id: r.id } } }),
      ),
    onSuccess: invalidate,
  });
  const ready = Boolean(held) && (placement || workerFee > 0);
  const repricing = r.status === 'PRICED';

  return (
    <Panel>
      <h2 className="m-0 text-[15px] font-bold">Price</h2>
      {placement ? (
        <Row
          label="Match fee (from settings)"
          value={platformFee !== null ? formatRwf(platformFee) : '…'}
        />
      ) : (
        <>
          <Field label="Worker fee (RWF)" small className="gap-1.5 font-semibold">
            <Input
              inputMode="numeric"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              disabled={!manage}
              placeholder="e.g. 15,000"
              className="h-12 border-ink text-lg font-bold"
            />
          </Field>
          <Row
            label="Platform fee (from settings)"
            value={platformFee !== null ? formatRwf(platformFee) : '…'}
          />
        </>
      )}
      <div className="h-px bg-line" />
      <div className="flex items-baseline justify-between">
        <span className="font-bold">Client pays</span>
        <span className="font-display text-2xl font-extrabold">
          {platformFee !== null ? formatRwf(workerFee + platformFee) : '…'}
        </span>
      </div>
      {manage && (
        <Field label="Note to client (optional)" small className="gap-1.5 font-semibold">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Groceries paid separately on receipt"
          />
        </Field>
      )}
      {price.error && <ErrorNote error={price.error} />}
      {manage &&
        (held ? (
          <>
            <div className="flex items-center gap-2.5 rounded-xl bg-peach px-3.5 py-3 text-sm">
              <UserCheck size={18} aria-hidden="true" />
              <span>
                <HeldName request={r} id={held} /> assigned — confirmed after payment
              </span>
            </div>
            <Button
              disabled={!ready}
              loading={price.isPending}
              onClick={() => price.mutate()}
              className="h-[50px]"
            >
              {repricing ? 'Update price' : 'Send price to client'}
            </Button>
          </>
        ) : (
          <div className="flex h-[50px] items-center justify-center rounded-[14px] bg-sand-2 text-[15px] font-bold text-muted">
            Assign a worker to send the price
          </div>
        ))}
      {repricing && manage && (
        <div className="flex flex-col gap-1.5 border-t border-divider pt-3">
          <span className="text-[13px] text-muted">
            Sent {formatShortDate(r.quote!.pricedAt)}
            {r.remindedAt
              ? ` · last reminded ${formatShortDate(r.remindedAt)} ${formatTime(r.remindedAt)}`
              : ' · not reminded yet'}
          </span>
          {remind.error && <ErrorNote error={remind.error} />}
          {remind.isSuccess && <Alert tone="success">Reminder sent by email and SMS.</Alert>}
          <Button
            variant="outline"
            size="sm"
            loading={remind.isPending}
            onClick={() => remind.mutate()}
          >
            Remind client to pay
          </Button>
        </div>
      )}
    </Panel>
  );
}

/** Name of the held worker, from the suggestions already loaded. */
function HeldName({ request, id }: { request: AdminServiceRequestDetail; id: string }) {
  const queryClient = useQueryClient();
  const lists = queryClient.getQueriesData<Array<{ id: string; fullName: string }>>({
    queryKey: ['admin', 'suggestions', request.id],
  });
  const fromList = lists.flatMap(([, data]) => data ?? []).find((w) => w.id === id)?.fullName;
  return (
    <strong>{fromList ?? (request.worker?.id === id ? request.worker.fullName : 'Worker')}</strong>
  );
}

function ConfirmPanel({
  request: r,
  manage,
  held,
}: {
  request: AdminServiceRequestDetail;
  manage: boolean;
  held: string | null;
}) {
  const invalidate = useInvalidate(r.id);
  const confirm = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/admin/service-requests/{id}/assign', {
          params: { path: { id: r.id } },
          body: held && held !== r.worker?.id ? { workerId: held } : {},
        }),
      ),
    onSuccess: invalidate,
  });
  return (
    <Panel>
      <h2 className="m-0 text-[15px] font-bold">Confirm worker</h2>
      <Row
        label="Paid"
        value={
          r.payment ? `${formatRwf(r.payment.amountRwf)} · ${r.payment.receiptReference}` : '—'
        }
      />
      <p className="m-0 text-sm text-muted">
        Confirming tells the client who's coming. Brief the worker before the{' '}
        {r.kind === 'PLACEMENT' ? 'start date' : 'visit'}.
      </p>
      {confirm.error && <ErrorNote error={confirm.error} />}
      {manage &&
        (held ? (
          <Button loading={confirm.isPending} onClick={() => confirm.mutate()} className="h-[50px]">
            Confirm <HeldName request={r} id={held} />
          </Button>
        ) : (
          <div className="flex h-[50px] items-center justify-center rounded-[14px] bg-sand-2 text-[15px] font-bold text-muted">
            Choose a worker to confirm
          </div>
        ))}
    </Panel>
  );
}

function ProgressPanel({ request: r }: { request: AdminServiceRequestDetail }) {
  const invalidate = useInvalidate(r.id);
  const start = useMutation({
    mutationFn: () =>
      unwrap(api.POST('/v1/admin/service-requests/{id}/start', { params: { path: { id: r.id } } })),
    onSuccess: invalidate,
  });
  const complete = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/admin/service-requests/{id}/complete', { params: { path: { id: r.id } } }),
      ),
    onSuccess: invalidate,
  });
  return (
    <Panel>
      <h2 className="m-0 text-[15px] font-bold">
        {r.kind === 'PLACEMENT' ? 'Placement' : 'Visit'}
      </h2>
      <p className="m-0 text-sm text-muted">
        The client usually confirms {r.kind === 'PLACEMENT' ? 'the start' : 'when it’s done'}. If
        they don’t, it closes automatically after the release window and the worker is paid.
      </p>
      {(start.error || complete.error) && <ErrorNote error={start.error ?? complete.error} />}
      <div className="grid grid-cols-2 gap-2.5">
        {r.status === 'ASSIGNED' && r.kind === 'VISIT' && (
          <Button
            variant="outline"
            size="md"
            loading={start.isPending}
            onClick={() => start.mutate()}
          >
            Mark in progress
          </Button>
        )}
        <Button
          size="md"
          loading={complete.isPending}
          onClick={() => complete.mutate()}
          className="col-span-1"
        >
          {r.kind === 'PLACEMENT' ? 'Mark as started' : 'Mark as done'}
        </Button>
      </div>
    </Panel>
  );
}

function CancelPanel({ request: r }: { request: AdminServiceRequestDetail }) {
  const invalidate = useInvalidate(r.id);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const cancel = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/admin/service-requests/{id}/cancel', {
          params: { path: { id: r.id } },
          body: { reason: reason.trim() },
        }),
      ),
    onSuccess: invalidate,
  });
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start bg-transparent p-0 text-sm font-bold text-danger"
      >
        Cancel this request
      </button>
    );
  }
  return (
    <Panel>
      <h2 className="m-0 text-[15px] font-bold">Cancel request</h2>
      {r.payment && (
        <Alert tone="warn">
          The client has paid. Cancelling doesn’t refund them; issue the refund separately.
        </Alert>
      )}
      <Field label="Reason (shown to the client)" small className="gap-1.5 font-semibold">
        <TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      {cancel.error && <ErrorNote error={cancel.error} />}
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="outline" size="md" onClick={() => setOpen(false)}>
          Keep it
        </Button>
        <Button
          size="md"
          disabled={!reason.trim()}
          loading={cancel.isPending}
          onClick={() => cancel.mutate()}
          className="bg-danger hover:bg-danger-ink"
        >
          Cancel request
        </Button>
      </div>
    </Panel>
  );
}

function AssignedWorker({ request: r }: { request: AdminServiceRequestDetail }) {
  return (
    <Panel>
      <PanelTitle>Worker</PanelTitle>
      {r.worker ? (
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold">{r.worker.fullName}</span>
          <span className="text-[13px] text-muted">
            {r.worker.ratingAverage !== null ? `${r.worker.ratingAverage.toFixed(1)} · ` : ''}
            {r.worker.completedJobs} jobs · {r.worker.idVerified ? 'ID verified' : 'not verified'}
          </span>
        </div>
      ) : (
        <p className="m-0 text-sm text-muted">No worker on this request.</p>
      )}
      {r.payment && (
        <Row
          label="Paid"
          value={`${formatRwf(r.payment.amountRwf)} · ${r.payment.receiptReference}`}
        />
      )}
      {r.review && (
        <Row
          label="Client rating"
          value={`${r.review.rating}/5${r.review.comment ? ` · “${r.review.comment}”` : ''}`}
        />
      )}
    </Panel>
  );
}

function Timeline({ request: r }: { request: AdminServiceRequestDetail }) {
  return (
    <Panel>
      <h2 className="m-0 text-[15px] font-bold">Timeline</h2>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {r.timeline.map((e, i) => (
          <li key={i} className="flex items-start justify-between gap-3 text-sm">
            <span>
              <span className="font-semibold">{REQUEST_STATUS[e.status].label}</span>
              {e.note ? <span className="text-muted"> · {e.note}</span> : null}
            </span>
            <span className="flex-none text-[13px] text-muted">
              {formatShortDate(e.at)} {formatTime(e.at)}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
