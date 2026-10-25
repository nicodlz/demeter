/**
 * Calendar-date helpers.
 *
 * Bank statements, invoices and snapshots are calendar dates, not instants.
 * Converting a local calendar date through `Date#toISOString()` shifts it by
 * one day in every timezone with a non-zero offset. These helpers keep the
 * calendar components intact.
 */

const pad2 = (value: number): string => String(value).padStart(2, "0");

const hasTimezone = (value: string): boolean =>
  /(Z|[+-]\d{2}:?\d{2})$/.test(value);

/** Format a Date using its local calendar components as YYYY-MM-DD. */
export const formatLocalDate = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** Today's local calendar date as YYYY-MM-DD. */
export const todayLocalISO = (): string => formatLocalDate(new Date());

/** A local calendar date `days` from today as YYYY-MM-DD. */
export const addDaysLocal = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
};

/**
 * Parse a date string without shifting calendar dates.
 *
 * - `YYYY-MM-DD` and `YYYY-MM-DDTHH:mm:ss` (no offset) keep their leading
 *   calendar date.
 * - Strings with an explicit offset (`Z`, `+02:00`) are real instants and are
 *   projected into the local calendar.
 */
export const parseCalendarDate = (value: string): Date => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match && !hasTimezone(value)) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
};

/** Normalize a date/datetime string to the local YYYY-MM-DD calendar date. */
export const toCalendarDate = (value: string): string => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match && !hasTimezone(value)) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const parsed = parseCalendarDate(value);
  return Number.isNaN(parsed.getTime()) ? value : formatLocalDate(parsed);
};

/** True when the string is a valid YYYY-MM-DD calendar date. */
export const isValidCalendarDate = (value: string): boolean => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return (
    date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3])
  );
};
