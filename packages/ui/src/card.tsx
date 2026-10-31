import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cx('flex flex-col gap-3 rounded-2xl border border-line bg-white p-4', className)}
      {...props}
    />
  );
}

/** Navy hero panel with the brand ring motif. */
export function HeroPanel({
  className,
  ringPosition = 'top',
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { ringPosition?: 'top' | 'bottom' }) {
  return (
    <section
      className={cx(
        'relative flex flex-col overflow-hidden rounded-[20px] bg-ink p-5 text-white',
        className,
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className={cx(
          'absolute size-[170px] rounded-full border-[26px] border-brand opacity-90',
          ringPosition === 'top' ? '-top-[50px] -right-10' : '-right-[60px] -bottom-[70px]',
        )}
      />
      <div className="relative flex flex-col gap-[inherit]">{children}</div>
    </section>
  );
}
