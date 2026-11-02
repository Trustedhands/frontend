'use client';

import { cx } from '@trustedhands/ui';
import type { ReactNode } from 'react';

/** Small square button with an icon, e.g. the reorder arrows. */
export function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg border border-field bg-white text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** A labelled on/off switch. */
export function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label
      className={cx(
        'flex items-center justify-between gap-3 text-sm',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
    >
      <span>
        <span className="font-bold">{label}</span> <span className="text-muted">· {hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-6 w-11 flex-none accent-ink"
      />
    </label>
  );
}
