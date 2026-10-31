'use client';

import { Alert, Badge, Button, buttonClass, Spinner, TextArea, cx } from '@trustedhands/ui';
import {
  formatFullDate,
  formatNumber,
  formatShortDate,
  formatTime,
  maskPhone,
} from '@trustedhands/ui/format';
import type { WorkerDetail } from '@trustedhands/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ErrorNote, PageHeader, Panel, PanelTitle, Table, Td, Th } from '@/components/page';
import { api, unwrap } from '@/lib/api';
import { useAuthedFile } from '@/lib/files';
import { LANGUAGE_LABELS, WORKER_STATUS } from '@/lib/labels';
import { useCan } from '@/lib/staff';

type CheckKey = 'fullName' | 'dateOfBirth' | 'idNumber' | 'photo' | 'reference';

const ACTIVITY: Record<string, string> = {
  'worker.created': 'Added',
  'worker.updated': 'Details edited',
  'worker.identity_changed': 'Identity details changed (needs re-verification)',
  'worker.document_uploaded': 'Document uploaded',
  'worker.submitted': 'Sent to verification',
  'worker.verified': 'Verified',
  'worker.declined': 'Declined',
  'worker.activated': 'Re-activated',
  'worker.deactivated': 'Deactivated',
};

const ID_TYPES = {
  NATIONAL_ID: 'National ID',
  PASSPORT: 'Passport',
  DRIVING_LICENCE: 'Driving licence',
} as const;

export default function WorkerPage() {
  const { id } = useParams<{ id: string }>();
  const can = useCan();
  const worker = useQuery({
    queryKey: ['admin', 'worker', id],
    queryFn: () => unwrap(api.GET('/v1/admin/workers/{id}', { params: { path: { id } } })),
  });
  const services = useQuery({
    queryKey: ['admin', 'service-types'],
    queryFn: () => unwrap(api.GET('/v1/admin/settings/service-types')),
  });
  const w = worker.data;
  const label = (key: string) => services.data?.find((s) => s.key === key)?.label ?? key;

  if (worker.error) return <ErrorNote error={worker.error} />;
  if (!w) return <Spinner />;
  const status = WORKER_STATUS[w.status];

  return (
    <>
      <PageHeader
        back={{ href: '/workers', label: 'Workers' }}
        title={w.fullName}
        badge={
          <>
            <Badge tone={status.tone}>{status.label}</Badge>
            {!w.active && <Badge tone="neutral">Inactive</Badge>}
          </>
        }
        subtitle={[
          w.categories.map(label).join(', ') || 'No services yet',
          w.createdByName && `Added by ${w.createdByName} · ${formatShortDate(w.createdAt)}`,
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={
          can('workers.manage') && (
            <Link href={`/workers/${w.id}/edit`} className={buttonClass('outline', 'sm', 'h-11')}>
              <Pencil size={16} aria-hidden="true" />
              Edit details
            </Link>
          )
        }
      />
      {w.status === 'DECLINED' && w.declineReason && <Alert>Declined: {w.declineReason}</Alert>}

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[3_1_600px] flex-col gap-[18px]">
          <Panel>
            <PanelTitle>ID documents</PanelTitle>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3.5">
              <DocPreview worker={w} kind="PHOTO" label="Photo" />
              <DocPreview worker={w} kind="ID_FRONT" label="ID front" />
              {w.idType !== 'PASSPORT' && <DocPreview worker={w} kind="ID_BACK" label="ID back" />}
            </div>
          </Panel>

          <Panel className="p-0 pt-5">
            <div className="px-5">
              <PanelTitle>Check against the ID</PanelTitle>
            </div>
            <Table minWidth={480}>
              <thead>
                <tr>
                  <Th>Field</Th>
                  <Th>Entered</Th>
                </tr>
              </thead>
              <tbody>
                <Row label="Full name" value={w.fullName} />
                <Row
                  label="Date of birth"
                  value={w.dateOfBirth ? formatFullDate(w.dateOfBirth) : null}
                />
                <Row
                  label="ID"
                  value={
                    w.idNumber ? `${ID_TYPES[w.idType ?? 'NATIONAL_ID']} · ${w.idNumber}` : null
                  }
                />
                <Row
                  label="Gender"
                  value={
                    w.gender === 'FEMALE' ? 'Female' : w.gender === 'MALE' ? 'Male' : 'Not given'
                  }
                />
                <Row label="Nationality" value={w.nationality} />
                <Row
                  label="Languages"
                  value={w.languages.map((l) => LANGUAGE_LABELS[l]).join(', ')}
                />
                <Row label="Phone" value={w.phone} />
                <Row
                  label="Address"
                  value={[w.village, w.cell, w.sector, w.district, w.province]
                    .filter(Boolean)
                    .join(', ')}
                />
                <Row label="Experience & references" value={w.experience} />
              </tbody>
            </Table>
          </Panel>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-[18px]">
            <Panel>
              <PanelTitle>Next of kin</PanelTitle>
              <Facts
                rows={[
                  ['Name', w.nextOfKinName],
                  ['Relationship', w.nextOfKinRelation],
                  ['Phone', w.nextOfKinPhone],
                  ['Address', w.nextOfKinAddress],
                  ['ID number', w.nextOfKinIdNumber],
                ]}
              />
            </Panel>
            <Panel>
              <PanelTitle>Payout</PanelTitle>
              <Facts
                rows={[
                  ['Mobile Money', w.payoutMsisdn && maskPhone(w.payoutMsisdn)],
                  ['Bank', w.payoutBankName],
                  ['Account', w.payoutBankAccount && `•••• ${w.payoutBankAccount.slice(-4)}`],
                ]}
              />
            </Panel>
          </div>

          {can('payments.view') && w.status === 'VERIFIED' && <Wallet workerId={w.id} />}
        </div>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-[18px]">
          <Decision worker={w} />
          {can('workers.manage') && <ActiveToggle worker={w} />}
          <Panel>
            <PanelTitle>Activity</PanelTitle>
            <ol className="m-0 flex list-none flex-col gap-3 p-0 text-sm">
              {w.activity.map((a) => (
                <li key={a.id} className="flex flex-col gap-0.5">
                  <span className="font-semibold">{ACTIVITY[a.action] ?? a.action}</span>
                  <span className="text-[13px] text-muted">
                    {a.actorName} · {formatShortDate(a.at)}, {formatTime(a.at)}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <tr>
      <Td className="w-[38%] text-muted">{label}</Td>
      <Td className={cx('font-semibold', !value && 'font-normal text-danger')}>
        {value || 'Missing'}
      </Td>
    </tr>
  );
}

function Facts({ rows }: { rows: Array<[string, string | null | undefined]> }) {
  return (
    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className={cx('m-0 font-semibold', !v && 'font-normal text-muted')}>{v || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function DocPreview({
  worker,
  kind,
  label,
}: {
  worker: WorkerDetail;
  kind: 'PHOTO' | 'ID_FRONT' | 'ID_BACK';
  label: string;
}) {
  const doc = worker.documents.find((d) => d.kind === kind);
  const file = useAuthedFile(
    doc
      ? `/v1/admin/workers/${worker.id}/documents/${kind}?v=${encodeURIComponent(doc.uploadedAt)}`
      : null,
  );
  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-line bg-paper">
        {!doc ? (
          <span className="text-sm text-danger">Not uploaded</span>
        ) : file.error ? (
          <span className="text-sm text-danger">Couldn&apos;t load</span>
        ) : !file.url ? (
          <Spinner label={`Loading ${label}`} />
        ) : file.type === 'application/pdf' ? (
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-2 text-sm font-bold"
          >
            <FileText size={32} aria-hidden="true" />
            Open PDF
          </a>
        ) : (
          <a href={file.url} target="_blank" rel="noreferrer" className="size-full">
            {/* eslint-disable-next-line @next/next/no-img-element -- authenticated blob URL */}
            <img
              src={file.url}
              alt={`${worker.fullName}: ${label}`}
              className="size-full object-contain"
            />
          </a>
        )}
      </div>
      <figcaption className="text-[13px] text-muted">
        {label}
        {doc && ` · ${formatShortDate(doc.uploadedAt)}`}
      </figcaption>
    </figure>
  );
}

function useWorkerMutation<T>(workerId: string, fn: (vars: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'worker', workerId] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'workers'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

const CHECKS: Array<{ key: CheckKey; label: string }> = [
  { key: 'fullName', label: 'Name matches the ID' },
  { key: 'dateOfBirth', label: 'Date of birth matches the ID' },
  { key: 'idNumber', label: 'ID number matches' },
  { key: 'photo', label: 'Photo is the same person as the ID' },
  { key: 'reference', label: 'Reference contacted' },
];

function Decision({ worker }: { worker: WorkerDetail }) {
  const can = useCan();
  const [checks, setChecks] = useState<Partial<Record<CheckKey, boolean>>>({});
  const [comment, setComment] = useState('');
  const [declining, setDeclining] = useState(false);
  const verify = useWorkerMutation(worker.id, () =>
    unwrap(
      api.POST('/v1/admin/workers/{id}/verify', {
        params: { path: { id: worker.id } },
        body: { checks: checks as never, comment: comment.trim() || undefined },
      }),
    ),
  );
  const decline = useWorkerMutation(worker.id, () =>
    unwrap(
      api.POST('/v1/admin/workers/{id}/decline', {
        params: { path: { id: worker.id } },
        body: { reason: comment.trim() },
      }),
    ),
  );
  const submit = useWorkerMutation(worker.id, () =>
    unwrap(api.POST('/v1/admin/workers/{id}/submit', { params: { path: { id: worker.id } } })),
  );

  if (worker.status === 'VERIFIED') {
    return (
      <Panel>
        <PanelTitle>Verified</PanelTitle>
        <p className="m-0 text-sm text-muted">
          {worker.verifiedByName ? `By ${worker.verifiedByName}` : 'Verified'}
          {worker.verifiedAt && ` · ${formatShortDate(worker.verifiedAt)}`}. {worker.completedJobs}{' '}
          jobs done
          {worker.ratingAverage != null && ` · ${worker.ratingAverage.toFixed(1)} ★`}.
        </p>
      </Panel>
    );
  }

  if (worker.status === 'DRAFT' || worker.status === 'DECLINED') {
    const missing = worker.checklist.filter((c) => !c.done);
    return (
      <Panel>
        <PanelTitle>{worker.status === 'DRAFT' ? 'Draft' : 'Fix and resubmit'}</PanelTitle>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
          {worker.checklist.map((c) => (
            <li key={c.key} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={cx(
                  'size-4 flex-none rounded-full',
                  c.done ? 'bg-success' : 'border-4 border-brand',
                )}
              />
              {c.done ? c.label : `${c.label} — ${c.missing}`}
            </li>
          ))}
        </ul>
        {submit.error && <Alert>{(submit.error as Error).message}</Alert>}
        {can('workers.manage') && (
          <Button
            size="md"
            disabled={missing.length > 0}
            loading={submit.isPending}
            onClick={() => submit.mutate(undefined)}
          >
            Send to verification
          </Button>
        )}
      </Panel>
    );
  }

  if (!can('workers.verify')) {
    return (
      <Panel>
        <PanelTitle>Awaiting verification</PanelTitle>
        <p className="m-0 text-sm text-muted">A verification lead will review this worker.</p>
      </Panel>
    );
  }
  const allChecked = CHECKS.every((c) => checks[c.key]);
  const error = verify.error ?? decline.error;
  return (
    <Panel className="border-2 border-ink">
      <PanelTitle>Decision</PanelTitle>
      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-2 text-[13px] text-muted">
          Tick each one after checking it yourself.
        </legend>
        {CHECKS.map((c) => (
          <label key={c.key} className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              className="size-[18px] accent-ink"
              checked={Boolean(checks[c.key])}
              onChange={(e) => setChecks((p) => ({ ...p, [c.key]: e.target.checked }))}
            />
            {c.label}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        {declining ? 'Reason for declining (the creator sees this)' : 'Comment (optional)'}
        <TextArea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="rounded-[10px] text-sm font-normal"
        />
      </label>
      {error && <Alert>{(error as Error).message}</Alert>}
      {declining ? (
        <>
          <Button
            variant="dark"
            size="md"
            disabled={!comment.trim()}
            loading={decline.isPending}
            onClick={() => decline.mutate(undefined)}
          >
            Decline worker
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeclining(false)}>
            Back
          </Button>
        </>
      ) : (
        <>
          <Button
            size="md"
            disabled={!allChecked}
            loading={verify.isPending}
            onClick={() => verify.mutate(undefined)}
          >
            Verify worker
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeclining(true)}>
            Decline
          </Button>
        </>
      )}
    </Panel>
  );
}

function ActiveToggle({ worker }: { worker: WorkerDetail }) {
  const toggle = useWorkerMutation(worker.id, (active: boolean) =>
    unwrap(
      api.PATCH('/v1/admin/workers/{id}/active', {
        params: { path: { id: worker.id } },
        body: { active },
      }),
    ),
  );
  return (
    <Panel>
      <PanelTitle>{worker.active ? 'Active' : 'Inactive'}</PanelTitle>
      <p className="m-0 text-sm text-muted">
        {worker.active
          ? 'Shown in matching when verified.'
          : "Hidden from matching. Existing jobs aren't affected."}
      </p>
      {toggle.error && <Alert>{(toggle.error as Error).message}</Alert>}
      <Button
        variant="outline"
        size="sm"
        loading={toggle.isPending}
        onClick={() => toggle.mutate(!worker.active)}
      >
        {worker.active ? 'Deactivate' : 'Re-activate'}
      </Button>
    </Panel>
  );
}

const ENTRY_LABELS: Record<string, string> = {
  RELEASED_TO_WORKER: 'Job released',
  REFUND: 'Refund',
  REFUND_REVERSED: 'Refund reversed',
  PAYOUT: 'Payout',
  PAYOUT_REVERSED: 'Payout reversed',
};

function Wallet({ workerId }: { workerId: string }) {
  const wallet = useQuery({
    queryKey: ['admin', 'wallet', workerId],
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/finance/workers/{id}/wallet', { params: { path: { id: workerId } } }),
      ),
  });
  return (
    <Panel className="p-0 pt-5">
      <div className="px-5">
        <PanelTitle
          action={
            wallet.data && (
              <span className="font-display text-lg font-extrabold">
                {formatNumber(wallet.data.balanceRwf)} RWF
              </span>
            )
          }
        >
          Wallet
        </PanelTitle>
      </div>
      {wallet.error && <ErrorNote error={wallet.error} />}
      {wallet.data && (
        <Table minWidth={420}>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Entry</Th>
              <Th>Job</Th>
              <Th className="text-right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {wallet.data.entries.length === 0 && (
              <tr>
                <Td colSpan={4} className="text-muted">
                  No earnings yet.
                </Td>
              </tr>
            )}
            {wallet.data.entries.map((e) => (
              <tr key={e.id}>
                <Td>{formatShortDate(e.at)}</Td>
                <Td>{ENTRY_LABELS[e.kind] ?? e.kind}</Td>
                <Td>{e.serviceRequestReference ?? '—'}</Td>
                <Td className={cx('text-right font-bold', e.amountRwf < 0 && 'text-danger')}>
                  {formatNumber(e.amountRwf)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}
