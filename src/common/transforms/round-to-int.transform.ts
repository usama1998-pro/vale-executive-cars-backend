import { Transform } from 'class-transformer';

/** Coerce API numbers to integers (e.g. MPV fare 82.5 → 83). */
export const RoundToInt = () =>
  Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return value;
    }
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : value;
  });
