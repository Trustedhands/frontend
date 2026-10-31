import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cx } from './cx';

const control =
  'w-full rounded-xl border border-field bg-white text-[15px] font-normal text-ink placeholder:text-muted/70 ' +
  'focus:border-ink focus:outline-none aria-invalid:border-danger';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(control, 'h-12 px-3.5', className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(control, 'h-12 px-3', className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(control, 'resize-none px-3.5 py-3 leading-[1.45]', className)}
      {...props}
    />
  );
}

/** Label wrapping a control, with optional hint and error. */
export function Field({
  label,
  hint,
  error,
  small = false,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  /** Smaller muted label, used inside cards */
  small?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cx(
        'flex flex-col',
        small ? 'gap-1 text-xs text-muted' : 'gap-1.5 text-sm font-semibold',
        className,
      )}
    >
      {label}
      {children}
      {error ? (
        <span role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </span>
      ) : (
        hint && <span className="text-[13px] font-normal text-muted">{hint}</span>
      )}
    </label>
  );
}
