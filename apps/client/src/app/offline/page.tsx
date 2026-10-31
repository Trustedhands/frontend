import type { Metadata } from 'next';
import { BrandLockup } from '@/components/brand-mark';

export const metadata: Metadata = { title: 'Offline' };

/** Served by the service worker when a navigation fails without a connection. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[600px] flex-col gap-6 px-6 py-5">
      <BrandLockup />
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.03em]">
          You're offline
        </h1>
        <p className="m-0 text-[15px] leading-[1.45] text-muted">
          Check your connection and try again. Your requests and payments are safe.
        </p>
      </div>
    </main>
  );
}
