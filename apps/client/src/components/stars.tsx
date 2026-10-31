import { Star } from 'lucide-react';
import { cx } from '@trustedhands/ui';

/** Read-only star row, e.g. on a reviewed request. */
export function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden="true"
          className={cx(n <= rating ? 'fill-brand text-brand' : 'text-ring-off')}
        />
      ))}
    </span>
  );
}

/** Tappable 1–5 star picker with 52px targets. */
export function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex justify-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="flex size-[52px] items-center justify-center border-0 bg-transparent p-0"
        >
          <Star
            size={40}
            aria-hidden="true"
            strokeWidth={1.75}
            className={cx(n <= value ? 'fill-brand text-brand' : 'text-ring-off')}
          />
        </button>
      ))}
    </div>
  );
}
