'use client';

import { cx } from '@trustedhands/ui';
import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

const LENGTH = 6;

/** Six single-digit boxes; typing advances, backspace retreats, paste fills. */
export function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '');
  const focus = (i: number) => refs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus();

  const setDigit = (i: number, digit: string) => {
    const next = digits.slice();
    next[i] = digit;
    onChange(next.join('').slice(0, LENGTH));
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i]) {
      e.preventDefault();
      setDigit(i - 1, '');
      focus(i - 1);
    } else if (e.key === 'ArrowLeft') {
      focus(i - 1);
    } else if (e.key === 'ArrowRight') {
      focus(i + 1);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    focus(pasted.length);
  };

  const current = Math.min(value.length, LENGTH - 1);

  return (
    <div className="grid grid-cols-6 gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          aria-label={`Digit ${i + 1}`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          value={digit}
          onPaste={onPaste}
          onKeyDown={(e) => onKeyDown(i, e)}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(-1);
            setDigit(i, d);
            if (d) focus(i + 1);
          }}
          className={cx(
            'h-[52px] min-w-0 rounded-xl bg-white text-center text-xl font-bold text-ink focus:outline-none',
            i === current && !disabled
              ? 'border-2 border-brand'
              : digit
                ? 'border border-ink'
                : 'border border-field',
          )}
        />
      ))}
    </div>
  );
}
