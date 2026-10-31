import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cx } from '@trustedhands/ui';
import type { ReactNode } from 'react';

/** Single-column flow screen (sign-up, forms, detail pages). */
export function FlowScreen({
  children,
  className,
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  /** Slightly narrower side padding, as on request screens */
  wide?: boolean;
}) {
  return (
    <main
      className={cx(
        'mx-auto flex min-h-dvh w-full max-w-[600px] flex-col gap-[22px] pt-5 pb-7',
        wide ? 'px-5' : 'px-6',
        className,
      )}
    >
      {children}
    </main>
  );
}

export function BackLink({ href, label = 'Back' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex size-11 flex-none items-center justify-center rounded-xl border border-line bg-white text-ink hover:text-ink"
    >
      <ChevronLeft size={22} aria-hidden="true" />
    </Link>
  );
}

/** Back button + page title, as on New request / Review & pay. */
export function PageHeader({
  backHref,
  title,
  action,
}: {
  backHref: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <BackLink href={backHref} />
      <h1 className="m-0 flex-1 font-display text-2xl font-extrabold tracking-[-0.02em]">
        {title}
      </h1>
      {action}
    </div>
  );
}

export function Heading({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="m-0 font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.03em]">
        {title}
      </h1>
      {lead && <p className="m-0 text-[15px] leading-[1.45] text-muted">{lead}</p>}
    </div>
  );
}

/** Definition list used in request summaries. */
export function DetailList({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="m-0 grid grid-cols-[96px_1fr] gap-x-3 gap-y-2.5 text-sm">
      {items.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted">{term}</dt>
          <dd className="m-0 font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
