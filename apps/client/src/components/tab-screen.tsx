import { cx } from '@trustedhands/ui';
import type { ReactNode } from 'react';

/** Content area of a tab page (Home uses the full width on large screens). */
export function TabScreen({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main
      className={cx(
        'mx-auto flex w-full flex-1 flex-col gap-4 px-5 pt-5 pb-4',
        wide
          ? 'max-w-[1200px] min-[900px]:px-6 min-[900px]:pt-8 min-[1280px]:px-8'
          : 'max-w-[720px]',
      )}
    >
      {children}
    </main>
  );
}

export function TabTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="m-0 font-display text-[28px] font-extrabold tracking-[-0.03em]">{children}</h1>
      {action}
    </div>
  );
}

/** Pill tabs used to filter lists ("Active · 3 / Past"). */
export function FilterTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1.5">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(o.value)}
            className={cx(
              'min-h-10 rounded-full px-3.5 text-sm',
              selected
                ? 'border-0 bg-ink font-bold text-white'
                : 'border border-field bg-white font-semibold text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
