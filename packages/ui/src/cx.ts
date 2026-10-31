import { twMerge } from 'tailwind-merge';

/**
 * Joins class names, skipping falsy values. Conflicting Tailwind utilities are
 * resolved in favour of the later one, so a component's `className` reliably
 * overrides its defaults (plain concatenation leaves it to stylesheet order).
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes);
}
