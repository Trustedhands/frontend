'use client';

import {
  Alert,
  Badge,
  Button,
  Select,
  Spinner,
  TextArea,
  cx,
  type BadgeTone,
} from '@trustedhands/ui';
import { formatDay, formatRwf, formatShortDate, formatTime } from '@trustedhands/ui/format';
import type { AdminTicket } from '@trustedhands/api';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Empty, ErrorNote, PageHeader, Panel, Tabs } from '@/components/page';
import { RefundPanel } from '@/components/refund-panel';
import { api, unwrap } from '@/lib/api';
import { downloadAuthed } from '@/lib/files';
import { useCan, useStaff } from '@/lib/staff';

type Status = AdminTicket['status'];
const STATUS: Record<Status, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Active', tone: 'brand' },
  OPEN: { label: 'Pending', tone: 'warn' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
};
const ORDER: Status[] = ['ACTIVE', 'OPEN', 'CLOSED'];
const ticketsKey = ['admin', 'tickets'] as const;

const sizeLabel = (bytes: number) =>
  bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1000))} KB`;

export default function SupportPage() {
  const [picked, setStatus] = useState<Status | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const queries = useQueries({
    queries: ORDER.map((s) => ({
      queryKey: [...ticketsKey, s],
      queryFn: () =>
        unwrap(
          api.GET('/v1/admin/support/tickets', {
            params: { query: { status: s, page: 1, pageSize: 50 } },
          }),
        ),
    })),
  });
  const lists = ORDER.map((s, i) => ({ status: s, query: queries[i]! }));
  // Until a tab is picked, open the first one with tickets in it
  const status =
    picked ?? lists.find((l) => l.status !== 'CLOSED' && l.query.data?.total)?.status ?? 'ACTIVE';
  const current = lists.find((l) => l.status === status)!.query;
  const items = current.data?.items ?? [];
  const ticket = items.find((t) => t.id === selected) ?? (selected ? null : items[0]) ?? null;

  return (
    <>
      <PageHeader
        title="Customer service"
        subtitle="Issues raised by clients, each linked to a service."
      />
      <Tabs
        label="Ticket status"
        value={status}
        onChange={(s) => {
          setStatus(s);
          setSelected(null);
        }}
        options={lists.map((l) => ({
          value: l.status,
          label: `${STATUS[l.status].label} · ${l.query.data?.total ?? '…'}`,
        }))}
      />
      {current.error && <ErrorNote error={current.error} />}
      {!current.data ? (
        <Spinner />
      ) : !items.length ? (
        <Empty>No {STATUS[status].label.toLowerCase()} tickets.</Empty>
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          <ul className="m-0 flex min-w-0 flex-[1_1_300px] list-none flex-col gap-2.5 p-0">
            {items.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-current={t.id === ticket?.id}
                  onClick={() => setSelected(t.id)}
                  className={cx(
                    'flex w-full flex-col gap-1 rounded-2xl bg-white p-4 text-left',
                    t.id === ticket?.id ? 'border-2 border-ink' : 'border border-line',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold">
                      #{t.reference} · {t.subject}
                    </span>
                    <Badge tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Badge>
                  </span>
                  <span className="text-[13px] text-muted">
                    {t.client.fullName}
                    {t.serviceRequest &&
                      ` · ${t.serviceRequest.categoryLabel} #${t.serviceRequest.reference}`}{' '}
                    · {formatShortDate(t.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {ticket ? (
            <TicketDetail key={ticket.id} ticket={ticket} />
          ) : (
            <div className="flex-[3_1_560px]" />
          )}
        </div>
      )}
    </>
  );
}

function TicketDetail({ ticket: t }: { ticket: AdminTicket }) {
  const can = useCan();
  const me = useStaff();
  const queryClient = useQueryClient();
  const manage = can('tickets.manage');
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const team = useQuery({
    queryKey: ['admin', 'team'],
    queryFn: () => unwrap(api.GET('/v1/admin/team')),
    enabled: can('team.manage'),
  });
  const request = useQuery({
    queryKey: ['admin', 'request', t.serviceRequest?.id],
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/service-requests/{id}', {
          params: { path: { id: t.serviceRequest!.id } },
        }),
      ),
    enabled: Boolean(t.serviceRequest),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ticketsKey });

  const update = useMutation({
    mutationFn: (body: { status?: Status; assignedToId?: string | null }) =>
      unwrap(api.PATCH('/v1/admin/support/tickets/{id}', { params: { path: { id: t.id } }, body })),
    onSuccess: refresh,
  });
  const addNote = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/admin/support/tickets/{id}/notes', {
          params: { path: { id: t.id } },
          body: { body: note.trim() },
        }),
      ),
    onSuccess: async () => {
      setNote('');
      await refresh();
    },
  });
  const sendReply = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/admin/support/tickets/{id}/replies', {
          params: { path: { id: t.id } },
          body: { body: reply.trim() },
        }),
      ),
    onSuccess: async () => {
      setReply('');
      setSent(`Emailed to ${t.client.email}.`);
      await refresh();
    },
  });

  // Customer service can't list the team; offer themselves and whoever has it now
  const assignees = team.data
    ? team.data.members.filter((m) => !m.disabled).map((m) => ({ id: m.id, fullName: m.fullName }))
    : [
        { id: me.id, fullName: me.fullName },
        ...(t.assignedTo && t.assignedTo.id !== me.id ? [t.assignedTo] : []),
      ];
  const r = request.data;
  const error = update.error ?? addNote.error ?? sendReply.error;

  return (
    <Panel className="flex-[3_1_560px] gap-[18px] p-[22px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 font-display text-2xl font-extrabold tracking-[-0.02em]">
            {t.subject}
          </h2>
          <span className="text-[13px] text-muted">
            #{t.reference} · opened by {t.client.fullName} · {formatShortDate(t.createdAt)},{' '}
            {formatTime(t.createdAt)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            Status
            <Select
              value={t.status}
              disabled={!manage || update.isPending}
              onChange={(e) => update.mutate({ status: e.target.value as Status })}
              className="h-10 min-w-32 rounded-[10px] text-sm text-ink"
            >
              {ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS[s].label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            Assigned to
            <Select
              value={t.assignedTo?.id ?? ''}
              disabled={!manage || update.isPending}
              onChange={(e) => update.mutate({ assignedToId: e.target.value || null })}
              className="h-10 min-w-40 rounded-[10px] text-sm text-ink"
            >
              <option value="">Nobody</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      {t.serviceRequest && (
        <Link
          href={`/requests/${t.serviceRequest.id}`}
          className="flex flex-col gap-0.5 rounded-xl bg-paper p-3.5 text-ink no-underline hover:text-ink"
        >
          <span className="text-sm font-bold">
            {t.serviceRequest.categoryLabel} · #{t.serviceRequest.reference}
          </span>
          <span className="text-[13px] text-muted">
            {formatDay(t.serviceRequest.scheduledAt)}, {formatTime(t.serviceRequest.scheduledAt)}
            {r?.worker && ` · Worker: ${r.worker.fullName}`}
            {r?.payment && ` · Paid ${formatRwf(r.payment.amountRwf)}`}
          </span>
        </Link>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="m-0 text-xs font-bold tracking-[0.06em] text-muted uppercase">
          Client&apos;s message
        </h3>
        <p className="m-0 text-[15px] leading-relaxed whitespace-pre-wrap">{t.description}</p>
        {t.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {t.attachments.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() =>
                  void downloadAuthed(
                    `/v1/admin/support/tickets/${t.id}/attachments/${a.id}`,
                    a.filename,
                  ).catch((err: Error) => setFileError(err.message))
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-field bg-white px-3 py-1.5 text-[13px] font-semibold text-ink"
              >
                <Paperclip size={14} aria-hidden="true" />
                {a.filename} · {sizeLabel(a.sizeBytes)}
              </button>
            ))}
          </div>
        )}
        {fileError && <Alert>{fileError}</Alert>}
      </section>

      {t.replies.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-xs font-bold tracking-[0.06em] text-muted uppercase">
            Replies sent
          </h3>
          {t.replies.map((e) => (
            <Entry key={e.id} author={e.author.fullName} at={e.at} body={e.body} />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="m-0 text-xs font-bold tracking-[0.06em] text-muted uppercase">
          Internal notes
        </h3>
        {t.notes.length === 0 && <p className="m-0 text-sm text-muted">No notes yet.</p>}
        {t.notes.map((e) => (
          <Entry key={e.id} author={e.author.fullName} at={e.at} body={e.body} tone="note" />
        ))}
      </section>

      {manage && (
        <section className="flex flex-col gap-2.5">
          <label className="flex flex-col gap-1.5 text-xs font-bold tracking-[0.06em] text-muted uppercase">
            Reply to client
            <TextArea
              rows={4}
              value={reply}
              onChange={(e) => {
                setReply(e.target.value);
                setSent(null);
              }}
              placeholder={`Hi ${t.client.fullName.split(' ')[0]}, …`}
              className="rounded-[10px] text-[15px] font-normal tracking-normal text-ink normal-case"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold tracking-[0.06em] text-muted uppercase">
            Internal note
            <TextArea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Only staff see this"
              className="rounded-[10px] text-sm font-normal tracking-normal text-ink normal-case"
            />
          </label>
          {error && <ErrorNote error={error} />}
          {sent && <Alert tone="success">{sent}</Alert>}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              disabled={!note.trim()}
              loading={addNote.isPending}
              onClick={() => addNote.mutate()}
            >
              Add internal note
            </Button>
            {r?.payment && can('payments.manage') && (
              <Button variant="outline" size="sm" onClick={() => setRefunding((v) => !v)}>
                Issue refund
              </Button>
            )}
            <Button
              size="sm"
              className="ml-auto"
              disabled={!reply.trim()}
              loading={sendReply.isPending}
              onClick={() => sendReply.mutate()}
            >
              Send reply
            </Button>
          </div>
        </section>
      )}
      {refunding && r?.payment && (
        <RefundPanel request={r} ticketId={t.id} onClose={() => setRefunding(false)} />
      )}
    </Panel>
  );
}

function Entry({
  author,
  at,
  body,
  tone = 'reply',
}: {
  author: string;
  at: string;
  body: string;
  tone?: 'reply' | 'note';
}) {
  return (
    <div
      className={cx(
        'flex flex-col gap-1 rounded-xl p-3.5',
        tone === 'note' ? 'bg-peach/60' : 'bg-paper',
      )}
    >
      <span className="text-[13px] font-bold">
        {author} · {formatShortDate(at)}, {formatTime(at)}
      </span>
      <p className="m-0 text-sm whitespace-pre-wrap">{body}</p>
    </div>
  );
}
