'use client';

import { PageHeader } from '@/components/page';
import { WorkerForm } from '@/components/worker-form';

export default function NewWorkerPage() {
  return (
    <>
      <PageHeader
        back={{ href: '/workers', label: 'Workers' }}
        title="Add a worker"
        subtitle="Fill in what the worker shared with you. A second admin verifies them before they can be assigned."
      />
      <WorkerForm />
    </>
  );
}
