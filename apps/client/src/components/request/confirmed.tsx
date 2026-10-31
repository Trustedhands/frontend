'use client';

import { Alert, Avatar, Button, buttonClass, Card, cx, HeroPanel } from '@trustedhands/ui';
import type { ServiceRequestDetail, ServiceRequestStatus } from '@trustedhands/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Check, LifeBuoy, ShieldCheck, Star } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DetailList } from '@/components/screen';
import { api, unwrap } from '@/lib/api';
import {
  describePlacement,
  formatDay,
  formatHours,
  formatRwf,
  formatShortDate,
  formatTime,
} from '@/lib/format';
import { listLanguages, RATING_LABELS, REVIEW_TAG_OPTIONS } from '@/lib/labels';
import { Stars } from '@/components/stars';
import { keys } from '@/lib/queries';
import { addressLine } from './summary';

/** Screen 8: paid request with its worker, details and progress. */
export function ConfirmedService({ request }: { request: ServiceRequestDetail }) {
  return (
    <>
      {request.payment && (
        <div className="flex items-center gap-3 rounded-2xl bg-success-bg px-4 py-3.5 text-success-ink">
          <span className="flex size-9 flex-none items-center justify-center rounded-full bg-success text-white">
            <Check size={20} aria-hidden="true" />
          </span>
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-bold">
              Paid · {formatRwf(request.payment.amountRwf)}
            </span>
            <span className="text-[13px]">Receipt #{request.payment.receiptReference} · MoMo</span>
          </div>
          <Link
            href="/payments"
            className="py-2.5 text-sm font-bold text-success-ink hover:text-success-ink"
          >
            Receipt
          </Link>
        </div>
      )}

      <WorkerPanel request={request} />

      <Card className="rounded-[18px]">
        <span className="text-sm font-bold">Service details</span>
        <DetailList
          items={[
            [
              'Type',
              request.placement
                ? `Long-term · ${describePlacement(request.placement)}`
                : `One-time · ${formatHours(request.durationHours ?? 0)}`,
            ],
            ['Address', addressLine(request)],
            [
              'Job',
              <span key="job" className="whitespace-pre-line">
                {request.description}
              </span>,
            ],
          ]}
        />
      </Card>

      <ProgressCard request={request} />

      <Actions request={request} />
    </>
  );
}

function WorkerPanel({ request }: { request: ServiceRequestDetail }) {
  const worker = request.worker;
  const placement = request.kind === 'PLACEMENT';
  // Placements have a start date, not an arrival time
  const when = placement
    ? formatDay(request.scheduledAt)
    : `${formatDay(request.scheduledAt)} at ${formatTime(request.scheduledAt)}`;

  if (!worker) {
    return (
      <HeroPanel ringPosition="bottom" className="gap-3">
        <span className="text-xs font-bold tracking-[0.08em] text-brand-soft uppercase">
          Your worker
        </span>
        <span className="font-display text-[21px] font-bold">We're confirming your worker</span>
        <span className="text-sm text-mist">
          You'll be notified as soon as they're assigned.{' '}
          {placement ? 'They start' : 'Your booking is for'} {when}.
        </span>
      </HeroPanel>
    );
  }

  const stats = [
    worker.ratingAverage !== null ? `${worker.ratingAverage.toFixed(1)}` : 'New',
    `${worker.completedJobs} ${worker.completedJobs === 1 ? 'job' : 'jobs'}`,
    worker.idVerified ? 'ID verified' : null,
  ].filter(Boolean);

  return (
    <HeroPanel ringPosition="bottom" className="gap-4">
      <span className="text-xs font-bold tracking-[0.08em] text-brand-soft uppercase">
        Your worker
      </span>
      <div className="flex items-center gap-3.5">
        <Avatar
          name={worker.fullName}
          size={72}
          className="border-[3px] border-white font-display font-extrabold"
        />
        <div className="flex flex-col gap-1">
          <span className="font-display text-[21px] font-bold">{worker.fullName}</span>
          <span className="flex items-center gap-1.5 text-[13px] text-mist">
            {worker.idVerified ? (
              <ShieldCheck size={16} aria-hidden="true" />
            ) : (
              <Star size={16} aria-hidden="true" />
            )}
            {stats.join(' · ')}
          </span>
          {worker.languages.length > 0 && (
            <span className="text-[13px] text-mist">Speaks {listLanguages(worker.languages)}</span>
          )}
        </div>
      </div>
      {request.status !== 'COMPLETED' && (
        <div className="flex items-center gap-2.5 rounded-xl bg-ink-2 px-3.5 py-3">
          <CalendarClock size={20} aria-hidden="true" />
          <span className="text-[15px] font-semibold">
            {placement ? 'Starts' : 'Arrives'} {when}
          </span>
        </div>
      )}
    </HeroPanel>
  );
}

const STEPS: Array<{ status: ServiceRequestStatus; label: string }> = [
  { status: 'PAID', label: 'Paid' },
  { status: 'ASSIGNED', label: 'Worker assigned' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'COMPLETED', label: 'Completed' },
];

function ProgressCard({ request }: { request: ServiceRequestDetail }) {
  // A placement goes straight from assigned to started
  const steps =
    request.kind === 'PLACEMENT' ? STEPS.filter((st) => st.status !== 'IN_PROGRESS') : STEPS;
  // If ops marked a placement in progress, it's still waiting to start
  const status =
    request.kind === 'PLACEMENT' && request.status === 'IN_PROGRESS' ? 'ASSIGNED' : request.status;
  const currentIndex = steps.findIndex((s) => s.status === status);
  const reachedAt = (status: ServiceRequestStatus) =>
    [...request.timeline].reverse().find((e) => e.status === status)?.at;

  return (
    <Card className="gap-0 rounded-[18px]">
      <span className="mb-3 text-sm font-bold">Progress</span>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {steps.map((step, i) => {
          const label =
            step.status === 'COMPLETED' && request.kind === 'PLACEMENT' ? 'Started' : step.label;
          const done = i <= currentIndex;
          const next = i === currentIndex + 1;
          const at = reachedAt(step.status);
          return (
            <li
              key={step.status}
              aria-current={i === currentIndex ? 'step' : undefined}
              className={cx('flex items-center gap-3 text-sm', !done && !next && 'text-muted')}
            >
              <span
                aria-hidden="true"
                className={cx(
                  'size-[22px] flex-none rounded-full',
                  done
                    ? 'bg-success'
                    : next
                      ? 'border-[6px] border-brand'
                      : 'border-2 border-ring-off',
                )}
              />
              <span className={cx('flex-1', done && 'font-semibold', next && 'font-bold')}>
                {label}
              </span>
              {done && at && <span className="text-[13px] text-muted">{formatShortDate(at)}</span>}
              {next && <span className="text-[13px] text-muted">Next</span>}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

const helpLink = (request: ServiceRequestDetail) => `/help?request=${request.id}`;

/** Bottom actions: what the client can do at this point. */
function Actions({ request }: { request: ServiceRequestDetail }) {
  if (request.status === 'COMPLETED') {
    return request.review ? (
      <YourReview request={request} />
    ) : (
      <div className="mt-auto grid grid-cols-2 gap-2.5">
        <HelpButton request={request} />
        <Link
          href={`/requests/${request.id}/review`}
          className={buttonClass('primary', 'md', 'h-[50px] rounded-[14px]')}
        >
          Rate &amp; review
        </Link>
      </div>
    );
  }
  if (request.status === 'ASSIGNED' || request.status === 'IN_PROGRESS') {
    return <MarkAsDone request={request} />;
  }
  return (
    <div className="mt-auto">
      <HelpButton request={request} />
    </div>
  );
}

function HelpButton({ request }: { request: ServiceRequestDetail }) {
  return (
    <Link
      href={helpLink(request)}
      className={buttonClass('outline', 'md', 'h-[50px] w-full rounded-[14px]')}
    >
      <LifeBuoy size={18} aria-hidden="true" />
      Get help
    </Link>
  );
}

function YourReview({ request }: { request: ServiceRequestDetail }) {
  const review = request.review!;
  const tagLabels = REVIEW_TAG_OPTIONS.filter((o) => review.tags.includes(o.value)).map(
    (o) => o.label,
  );
  return (
    <>
      <Card className="rounded-[18px]">
        <span className="text-sm font-bold">Your review</span>
        <div className="flex items-center gap-2">
          <Stars rating={review.rating} />
          <span className="text-sm font-semibold">{RATING_LABELS[review.rating]}</span>
        </div>
        {tagLabels.length > 0 && (
          <span className="text-[13px] text-muted">{tagLabels.join(' · ')}</span>
        )}
        {review.comment && <p className="m-0 text-sm leading-[1.45]">“{review.comment}”</p>}
      </Card>
      <div className="mt-auto">
        <HelpButton request={request} />
      </div>
    </>
  );
}

function MarkAsDone({ request }: { request: ServiceRequestDetail }) {
  const placement = request.kind === 'PLACEMENT';
  const queryClient = useQueryClient();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const complete = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/service-requests/{id}/complete', { params: { path: { id: request.id } } }),
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.request(request.id), updated);
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      router.push(`/requests/${request.id}/review`);
    },
  });

  return (
    <div className="mt-auto flex flex-col gap-2.5">
      {complete.error && <Alert>{complete.error.message}</Alert>}
      {confirming ? (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-4">
          <span className="text-[15px] font-bold">
            {placement
              ? `Has ${request.worker?.fullName ?? 'your worker'} started?`
              : 'Is the job finished?'}
          </span>
          <span className="text-sm text-muted">
            {placement
              ? 'Confirm once they have started working for you. Our match fee is then final.'
              : 'Only confirm once the work is done to your satisfaction.'}
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" size="md" onClick={() => setConfirming(false)}>
              Not yet
            </Button>
            <Button size="md" loading={complete.isPending} onClick={() => complete.mutate()}>
              {placement ? "Yes, they've started" : "Yes, it's done"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <HelpButton request={request} />
          <Button size="md" className="h-[50px] rounded-[14px]" onClick={() => setConfirming(true)}>
            {placement ? "They've started" : 'Mark as done'}
          </Button>
        </div>
      )}
    </div>
  );
}
