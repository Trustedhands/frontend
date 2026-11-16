import { cx } from '@trustedhands/ui';
import { Star } from 'lucide-react';

/** Five stars with the client's rating filled in; low ratings show in red. */
export function Rating({ value }: { value: number }) {
  const low = value <= 2;
  return (
    <span
      className={cx('inline-flex items-center gap-0.5', low ? 'text-danger' : 'text-ink')}
      role="img"
      aria-label={`${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          aria-hidden="true"
          fill={n <= value ? 'currentColor' : 'none'}
          className={n <= value ? undefined : 'text-field'}
        />
      ))}
      <span className="ml-1 text-[13px] font-bold">{value}/5</span>
    </span>
  );
}
