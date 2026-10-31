'use client';

import { Alert, Badge, Button, Field, Select, Spinner, TextArea } from '@trustedhands/ui';
import type { Ticket } from '@trustedhands/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Paperclip, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';
import { FlowScreen, PageHeader } from '@/components/screen';
import { api, unwrap } from '@/lib/api';
import { formatShortDate } from '@/lib/format';
import { CATEGORY_LABELS, TICKET_STATUS } from '@/lib/labels';
import { keys, useRequests, useTickets } from '@/lib/queries';

const MAX_FILES = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'application/pdf'];

export default function HelpPage() {
  return (
    <Suspense>
      <ReportIssue />
    </Suspense>
  );
}

/** Screen 12: report an issue, and see my tickets. */
function ReportIssue() {
  const queryClient = useQueryClient();
  const preselected = useSearchParams().get('request') ?? '';
  const active = useRequests('active');
  const past = useRequests('past');
  const tickets = useTickets();
  const requests = [...(active.data ?? []), ...(past.data ?? [])];

  const [serviceRequestId, setServiceRequestId] = useState(preselected);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Ticket | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const submit = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.set('description', description.trim());
      if (serviceRequestId) form.set('serviceRequestId', serviceRequestId);
      files.forEach((f) => form.append('files', f));
      return unwrap(
        api.POST('/v1/support/tickets', {
          // Sent as multipart; the typed body describes the same fields
          body: { description: description.trim() },
          bodySerializer: () => form,
        }),
      );
    },
    onSuccess: (ticket) => {
      setSubmitted(ticket);
      setDescription('');
      setFiles([]);
      void queryClient.invalidateQueries({ queryKey: keys.tickets });
    },
  });

  const addFiles = (list: FileList | null) => {
    setFileError(null);
    const chosen = Array.from(list ?? []);
    const bad = chosen.find((f) => !ACCEPTED.includes(f.type));
    if (bad) return setFileError(`${bad.name}: attach a JPG, PNG or PDF`);
    const big = chosen.find((f) => f.size > MAX_BYTES);
    if (big) return setFileError(`${big.name} is over 5 MB`);
    const next = [...files, ...chosen];
    if (next.length > MAX_FILES) return setFileError(`Attach up to ${MAX_FILES} files`);
    setFiles(next);
  };

  const tooShort = description.trim().length < 10;

  return (
    <FlowScreen wide className="gap-[18px]">
      <PageHeader backHref="/profile" title="Report an issue" />
      <p className="-mt-1.5 mb-0 text-[15px] leading-[1.45] text-muted">
        Our team reads every report and follows up by phone or email.
      </p>

      {submitted && (
        <Alert tone="success" title={`Report ${submitted.reference} received`}>
          Thanks for telling us. We'll be in touch soon.
        </Alert>
      )}

      <Field label={<span className="font-bold">Which service?</span>} className="gap-2">
        <Select
          className="h-[52px] font-semibold"
          value={serviceRequestId}
          onChange={(e) => setServiceRequestId(e.target.value)}
        >
          <option value="">Not about a specific booking</option>
          {requests.map((r) => (
            <option key={r.id} value={r.id}>
              {CATEGORY_LABELS[r.category]} · {formatShortDate(r.scheduledAt)} · #{r.reference}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label={<span className="font-bold">What happened?</span>}
        className="gap-2"
        hint={description && tooShort ? 'A few more words help us follow up.' : undefined}
      >
        <TextArea
          rows={5}
          maxLength={4000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. The worker arrived at 10:15 instead of 9:00, so the second bathroom wasn't finished."
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold">
          Attach a photo or document <span className="font-normal text-muted">(optional)</span>
        </span>
        {files.map((f, i) => (
          <div
            key={`${f.name}-${i}`}
            className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5"
          >
            <FileText size={18} className="flex-none text-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
            <button
              type="button"
              aria-label={`Remove ${f.name}`}
              onClick={() => setFiles(files.filter((_, j) => j !== i))}
              className="flex size-9 items-center justify-center rounded-lg border-0 bg-transparent text-muted"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        ))}
        {files.length < MAX_FILES && (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex h-16 items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-field bg-white text-sm font-semibold text-ink"
          >
            <Paperclip size={20} aria-hidden="true" />
            Add file · JPG, PNG or PDF
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED.join(',')}
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        {fileError && <Alert>{fileError}</Alert>}
      </div>

      {submit.error && <Alert>{submit.error.message}</Alert>}

      <Button disabled={tooShort} loading={submit.isPending} onClick={() => submit.mutate()}>
        Submit report
      </Button>

      <div className="my-1 h-px bg-line" />

      <h2 className="m-0 text-xs font-bold tracking-[0.08em] text-muted uppercase">My tickets</h2>
      {tickets.isPending ? (
        <Spinner />
      ) : tickets.data?.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {tickets.data.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-[14px] border border-line bg-white px-4 py-3.5"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-bold">
                  #{t.reference} · {t.subject}
                </span>
                <span className="text-[13px] text-muted">
                  {t.serviceRequest ? `${CATEGORY_LABELS[t.serviceRequest.category]} · ` : ''}opened{' '}
                  {formatShortDate(t.createdAt)}
                </span>
              </span>
              <Badge tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-muted">No reports yet.</p>
      )}
    </FlowScreen>
  );
}
