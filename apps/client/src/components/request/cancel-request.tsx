'use client';

import { Alert, Button, Field, TextArea } from '@trustedhands/ui';
import type { ServiceRequestDetail } from '@trustedhands/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, unwrap } from '@/lib/api';
import { keys } from '@/lib/queries';

/** "Cancel request" link that expands into a reason + confirm. */
export function CancelRequest({ request }: { request: ServiceRequestDetail }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const cancel = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/service-requests/{id}/cancel', {
          params: { path: { id: request.id } },
          body: { reason },
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
        className="bg-transparent p-3 text-sm font-bold text-danger"
      >
        Cancel request
      </button>
    );
  }
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
      <Field label="Why are you cancelling?">
        <TextArea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Plans changed"
        />
      </Field>
      {cancel.error && <Alert>{cancel.error.message}</Alert>}
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="outline" size="md" onClick={() => setOpen(false)}>
          Keep it
        </Button>
        <Button
          size="md"
          disabled={!reason.trim()}
          loading={cancel.isPending}
          onClick={() => cancel.mutate()}
          className="bg-danger hover:bg-danger/90"
        >
          Cancel request
        </Button>
      </div>
    </section>
  );
}
