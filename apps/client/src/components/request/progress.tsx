import { cx } from '@trustedhands/ui';
import type { ServiceRequestStatus } from '@trustedhands/api';

const STEPS = ['Requested', 'Priced', 'Paid', 'Worker set'] as const;

const REACHED: Partial<Record<ServiceRequestStatus, number>> = {
  REQUESTED: 1,
  ADJUSTMENT_REQUESTED: 1,
  PRICED: 2,
  PAID: 3,
  ASSIGNED: 4,
  IN_PROGRESS: 4,
  COMPLETED: 4,
};

/** Labelled four-step bar from the Review & pay screen. */
export function RequestProgress({ status }: { status: ServiceRequestStatus }) {
  const reached = REACHED[status] ?? 0;
  return (
    <ol aria-label="Progress" className="m-0 grid list-none grid-cols-4 gap-1.5 p-0">
      {STEPS.map((label, i) => {
        const done = i < reached - 1;
        const current = i === reached - 1;
        return (
          <li
            key={label}
            aria-current={current ? 'step' : undefined}
            className={cx(
              'flex flex-col gap-1.5 text-xs',
              done
                ? 'font-semibold text-success'
                : current
                  ? 'font-bold text-cta'
                  : 'font-medium text-muted',
            )}
          >
            <span
              className={cx(
                'h-1 rounded-sm',
                done ? 'bg-success' : current ? 'bg-brand' : 'bg-line',
              )}
            />
            {label}
          </li>
        );
      })}
    </ol>
  );
}
