import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'dark' | 'outline' | 'soft' | 'ghost';
export type ButtonSize = 'lg' | 'md' | 'sm';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-cta text-white hover:bg-cta-hover',
  dark: 'bg-ink text-white hover:bg-ink-2',
  outline: 'border border-ink bg-white text-ink hover:bg-sky',
  soft: 'border border-ink bg-sky text-ink hover:bg-mist',
  ghost: 'bg-transparent text-cta hover:text-cta-hover',
};

const sizes: Record<ButtonSize, string> = {
  lg: 'h-[52px] rounded-[14px] px-5 text-base',
  md: 'min-h-12 rounded-xl px-4 text-[15px]',
  sm: 'min-h-11 rounded-xl px-4 text-sm',
};

/** Class string for button-styled elements (also used on Next <Link>). */
export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'lg',
  extra?: string,
) {
  return cx(
    'inline-flex items-center justify-center gap-2 font-bold no-underline transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-60',
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({
  variant = 'primary',
  size = 'lg',
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  );
}
