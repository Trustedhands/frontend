import { cx } from '@trustedhands/ui';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';

export function PageHeader({
  title,
  eyebrow,
  subtitle,
  back,
  badge,
  actions,
}: {
  title: ReactNode;
  /** Small line above the title, e.g. the date */
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {back && (
          <Link
            href={back.href}
            className="mb-1 inline-flex items-center gap-1 self-start text-sm font-bold"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            {back.label}
          </Link>
        )}
        {eyebrow && <span className="text-sm text-muted">{eyebrow}</span>}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 font-display text-[32px] leading-tight font-extrabold tracking-[-0.03em]">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && <p className="m-0 max-w-3xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">{actions}</div>
      )}
    </header>
  );
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cx(
        'flex min-w-0 flex-col gap-3.5 rounded-[18px] border border-line bg-white p-5',
        className,
      )}
      {...props}
    />
  );
}

export function PanelTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="m-0 font-display text-lg font-bold">{children}</h2>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  note,
  dark = false,
  noteTone = 'muted',
  href,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  dark?: boolean;
  noteTone?: 'muted' | 'brand' | 'danger';
  href?: string;
}) {
  const body = (
    <>
      <span className={cx('text-[13px]', dark ? 'text-mist' : 'text-muted')}>{label}</span>
      <span className="font-display text-[34px] leading-none font-extrabold">{value}</span>
      {note && (
        <span
          className={cx(
            'text-[13px]',
            noteTone === 'brand' && 'font-bold text-brand-soft',
            noteTone === 'danger' && 'font-bold text-danger',
            noteTone === 'muted' && (dark ? 'text-mist' : 'text-muted'),
          )}
        >
          {note}
        </span>
      )}
    </>
  );
  const cls = cx(
    'flex flex-col gap-2 rounded-2xl p-[18px] no-underline',
    dark
      ? 'bg-ink text-white hover:text-white'
      : 'border border-line bg-white text-ink hover:text-ink',
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Table styled like the design: paper header, divider rows. */
export function Table({ children, minWidth = 640 }: { children: ReactNode; minWidth?: number }) {
  return (
    // relative: keeps absolutely positioned content (e.g. sr-only headers) inside the scroller
    <div className="relative overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cx(
        'bg-paper px-3 py-2.5 text-left text-xs font-bold tracking-[0.06em] text-muted uppercase first:pl-5 last:pr-5',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cx(
        'border-t border-divider px-3 py-3.5 align-middle first:pl-5 last:pr-5',
        className,
      )}
      {...props}
    />
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 rounded-2xl border border-dashed border-field bg-white p-6 text-center text-sm text-muted">
      {children}
    </p>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  return (
    <p role="alert" className="m-0 rounded-xl bg-danger-bg p-3 text-sm text-danger">
      {error instanceof Error ? error.message : 'Something went wrong. Try again.'}
    </p>
  );
}

/** Pill switcher for status filters and page sections. */
export function Tabs<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: ReactNode }>;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-10 rounded-full px-3.5 text-sm whitespace-nowrap',
            value === o.value
              ? 'border border-ink bg-ink font-bold text-white'
              : 'border border-field bg-white font-semibold text-ink hover:border-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
