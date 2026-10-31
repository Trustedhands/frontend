'use client';

import { Spinner } from '@trustedhands/ui';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ErrorNote, PageHeader } from '@/components/page';
import { WorkerForm } from '@/components/worker-form';
import { api, unwrap } from '@/lib/api';

export default function EditWorkerPage() {
  const { id } = useParams<{ id: string }>();
  const worker = useQuery({
    queryKey: ['admin', 'worker', id],
    queryFn: () => unwrap(api.GET('/v1/admin/workers/{id}', { params: { path: { id } } })),
  });
  return (
    <>
      <PageHeader
        back={{ href: `/workers/${id}`, label: worker.data?.fullName ?? 'Worker' }}
        title="Edit details"
      />
      {worker.error && <ErrorNote error={worker.error} />}
      {worker.data ? <WorkerForm worker={worker.data} /> : <Spinner />}
    </>
  );
}
