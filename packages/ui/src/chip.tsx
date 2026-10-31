import type { ReactNode } from 'react';
import { cx } from './cx';

/** Pill toggle, e.g. service type, gender, language. */
export function Chip({
  pressed,
  onToggle,
  children,
  className,
}: {
  pressed: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cx(
        'min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors',
        pressed
          ? 'border-ink bg-ink text-white'
          : 'border-field bg-white text-ink hover:border-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Single-select group of chips. */
export function ChipGroup<T extends string>({
  legend,
  legendClassName,
  options,
  value,
  onChange,
}: {
  legend: string;
  legendClassName?: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T | null | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className={cx('mb-2 text-sm font-semibold', legendClassName)}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o.value} pressed={value === o.value} onToggle={() => onChange(o.value)}>
            {o.label}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

/** Multi-select group of chips. */
export function MultiChipGroup<T extends string>({
  legend,
  legendClassName,
  options,
  value,
  onChange,
}: {
  legend: string;
  legendClassName?: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: readonly T[];
  onChange: (value: T[]) => void;
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className={cx('mb-2 text-sm font-semibold', legendClassName)}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <Chip
              key={o.value}
              pressed={on}
              onToggle={() =>
                onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])
              }
            >
              {o.label}
            </Chip>
          );
        })}
      </div>
    </fieldset>
  );
}
