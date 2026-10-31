'use client';

import { Alert, Avatar, Button, MultiChipGroup, Spinner, TextArea } from '@trustedhands/ui';
import type { ReviewTag } from '@trustedhands/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { FlowScreen } from '@/components/screen';
import { StarPicker } from '@/components/stars';
import { api, unwrap } from '@/lib/api';
import { firstName, formatDay } from '@/lib/format';
import { RATING_LABELS, REVIEW_TAG_OPTIONS } from '@/lib/labels';
import { keys, useRequest } from '@/lib/queries';

/** Screen 9: rate the worker after a completed job. */
export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const request = useRequest(id);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<ReviewTag[]>([]);
  const [comment, setComment] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/service-requests/{id}/review', {
          params: { path: { id } },
          body: { rating, tags, comment: comment.trim() || undefined },
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.request(id) });
      router.replace(`/requests/${id}`);
    },
  });

  const r = request.data;
  if (!r) {
    return (
      <FlowScreen wide>
        {request.error ? <Alert>We couldn't load this request.</Alert> : <Spinner />}
      </FlowScreen>
    );
  }
  if (r.status !== 'COMPLETED' || !r.worker || r.hasReview) {
    return (
      <FlowScreen wide>
        <Alert tone="warn">
          {r.hasReview
            ? 'You have already reviewed this job. Thank you!'
            : 'You can review this job once it is completed.'}
        </Alert>
        <Link href={`/requests/${id}`} className="text-sm font-bold">
          Back to the request
        </Link>
      </FlowScreen>
    );
  }

  const name = firstName(r.worker.fullName);
  return (
    <FlowScreen wide className="gap-5">
      <div className="flex justify-end">
        <Link
          href={`/requests/${id}`}
          aria-label="Close"
          className="flex size-11 items-center justify-center rounded-xl border border-line bg-white text-ink hover:text-ink"
        >
          <X size={22} aria-hidden="true" />
        </Link>
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar
          name={r.worker.fullName}
          size={84}
          className="border-4 border-brand font-display font-extrabold"
        />
        <h1 className="m-0 font-display text-[27px] leading-[1.1] font-extrabold tracking-[-0.02em]">
          How did {name} do?
        </h1>
        <p className="m-0 text-sm text-muted">
          {r.categoryLabel} · {formatDay(r.scheduledAt)} · Completed
        </p>
      </div>

      <StarPicker value={rating} onChange={setRating} />
      <span className="-mt-2 min-h-5 text-center text-[15px] font-bold" aria-live="polite">
        {rating ? RATING_LABELS[rating] : 'Tap a star to rate'}
      </span>

      <MultiChipGroup
        legend="What stood out?"
        legendClassName="mb-2.5 font-bold"
        options={REVIEW_TAG_OPTIONS}
        value={tags}
        onChange={setTags}
      />

      <label className="flex flex-col gap-2 text-sm font-bold">
        <span>
          Anything to add?{' '}
          <span className="text-[13px] font-normal text-muted">
            Shared with {name} to help them improve
          </span>
        </span>
        <TextArea
          rows={3}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="e.g. Great job on the kitchen."
        />
      </label>

      {submit.error && <Alert>{submit.error.message}</Alert>}

      <div className="mt-auto flex flex-col gap-1.5">
        <Button disabled={!rating} loading={submit.isPending} onClick={() => submit.mutate()}>
          Submit review
        </Button>
        <Link href={`/help?request=${id}`} className="p-3 text-center text-sm font-bold">
          Something went wrong? Report it
        </Link>
      </div>
    </FlowScreen>
  );
}
