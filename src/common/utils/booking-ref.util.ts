import { randomInt } from 'node:crypto';

/** Short numeric booking reference, e.g. `482917` (6 digits). */
export const BOOKING_REF_LENGTH = 6;

const NUMERIC_REF_PATTERN = /^\d{4,10}$/;

export function isNumericBookingRef(value: string): boolean {
  return NUMERIC_REF_PATTERN.test(value.trim());
}

/** Random 6-digit code in [100000, 999999]. */
export function generateNumericBookingRef(): string {
  return String(randomInt(100_000, 1_000_000));
}
