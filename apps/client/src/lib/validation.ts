/** Rwandan mobile number without the +250 prefix: 9 digits starting with 7. */
export function normalizeLocalPhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('250')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return /^7[2389]\d{7}$/.test(digits) ? digits : null;
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Matches the design's rule: at least 8 characters, with a number. */
export const isStrongEnoughPassword = (value: string) => value.length >= 8 && /\d/.test(value);
