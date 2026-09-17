/**
 * Timezone-safe local date helpers.
 *
 * All subscription dates are stored as 'YYYY-MM-DD' strings in the DB.
 * NEVER parse these with `new Date('YYYY-MM-DD')` — it interprets them as UTC
 * midnight, which shifts the day on any timezone behind UTC and breaks
 * day-level math around DST boundaries. These helpers always construct dates
 * in local time from the components.
 */

/** Parse 'YYYY-MM-DD' (or a full ISO string) into a local Date at midnight. */
export function parseLocalDate(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  // Fallback for unexpected formats — still normalized to local midnight.
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Today's date at local midnight. */
export function todayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whole-day difference from today to the given date (negative = past). */
export function daysUntil(dateStr: string): number {
  const target = parseLocalDate(dateStr);
  const diffMs = target.getTime() - todayLocal().getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Format a Date as 'YYYY-MM-DD' in local time. */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** True if the year is a leap year (needed for safe month-end arithmetic). */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Days in a given month (1-12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Add one billing cycle to a date string, clamping to the month end
 * (Jan 31 + 1 month => Feb 28/29, not a rolled-over March date).
 *
 * Month-based cycles use explicit month arithmetic rather than setMonth,
 * because JS rolls overflow silently (Jan 31 + 1 month => Mar 3), which
 * both shifts the month AND defeats naive clamping (Mar has 31 days).
 */
export function addCycle(dateStr: string, cycle: string): string {
  const d = parseLocalDate(dateStr);
  const day = d.getDate();

  switch (cycle) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      return toLocalDateStr(d);
    case 'weekly':
      d.setDate(d.getDate() + 7);
      return toLocalDateStr(d);
    case 'monthly':
    case 'quarterly':
    case 'yearly': {
      const addMonths = cycle === 'monthly' ? 1 : cycle === 'quarterly' ? 3 : 12;
      const anchorMonths = d.getFullYear() * 12 + d.getMonth() + addMonths;
      const targetYear = Math.floor(anchorMonths / 12);
      const targetMonth = anchorMonths % 12; // 0-indexed
      const lastDay = daysInMonth(targetYear, targetMonth + 1);
      return toLocalDateStr(new Date(targetYear, targetMonth, Math.min(day, lastDay)));
    }
    default:
      d.setMonth(d.getMonth() + 1);
      return toLocalDateStr(d);
  }
}
