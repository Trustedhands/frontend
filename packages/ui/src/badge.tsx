import type { ReactNode } from 'react';
import { cx } from './cx';

export type BadgeTone = 'success' | 'warn' | 'brand' | 'info' | 'neutral' | 'danger';

const tones: Record<BadgeTone, string> = {
  success: 'bg-success-bg text-success',
  warn: 'bg-warn-bg text-warn',
  brand: 'bg-peach text-cta-hover',
  info: 'bg-sky text-ink-2',
  neutral: 'bg-sand-2 text-muted',
  danger: 'bg-danger-bg text-danger',
};

export function Badge({
  tone,
  children,
  icon,
  className,
}: {
  tone: BadgeTone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex flex-none items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
