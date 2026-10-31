import type { ReactNode } from 'react';
import { cx } from './cx';

/** Segmented progress bar, e.g. sign-up steps or request status. */
export function StepBar({
  total,
  done,
  color = 'bg-brand',
  thin = false,
}: {
  total: number;
  done: number;
  color?: string;
  thin?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cx('grid gap-1.5', thin && 'gap-1')}
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cx(
            thin ? 'h-1 rounded-sm' : 'h-[5px] rounded-[3px]',
            i < done ? color : 'bg-line',
          )}
        />
      ))}
    </div>
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({
  name,
  size = 44,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        'flex flex-none items-center justify-center rounded-full bg-sky font-bold text-ink',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size / 3) }}
    >
      {initials(name)}
    </div>
  );
}

export function Alert({
  tone = 'danger',
  title,
  children,
}: {
  tone?: 'danger' | 'warn' | 'success';
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    danger: 'bg-danger-bg text-danger',
    warn: 'bg-warn-bg text-warn-ink',
    success: 'bg-success-bg text-success-ink',
  };
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx('flex flex-col gap-1 rounded-xl p-3 text-sm leading-[1.45]', tones[tone])}
    >
      {title && <span className="font-bold">{title}</span>}
      <span>{children}</span>
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center py-10 text-muted">
      <span
        aria-hidden="true"
        className="size-6 animate-spin rounded-full border-[3px] border-line border-t-brand"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
