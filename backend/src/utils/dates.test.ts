import { describe, it, expect } from 'vitest';
import { parseLocalDate, daysUntil, toLocalDateStr, addCycle, daysInMonth } from './dates.js';

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD as LOCAL midnight (never UTC-shifted)', () => {
    const d = parseLocalDate('2026-09-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8); // September
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
  });

  it('normalizes full ISO strings to local midnight', () => {
    const d = parseLocalDate('2026-09-15T13:45:00.000Z');
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});

describe('daysUntil', () => {
  it('computes whole-day diffs without DST/time-of-day drift', () => {
    const today = toLocalDateStr(new Date());
    expect(daysUntil(today)).toBe(0);

    const tomorrow = toLocalDateStr(new Date(Date.now() + 24 * 3600 * 1000));
    expect(daysUntil(tomorrow)).toBe(1);

    const yesterday = toLocalDateStr(new Date(Date.now() - 24 * 3600 * 1000));
    expect(daysUntil(yesterday)).toBe(-1);
  });
});

describe('addCycle', () => {
  it('adds each cycle correctly', () => {
    expect(addCycle('2026-01-01', 'daily')).toBe('2026-01-02');
    expect(addCycle('2026-01-01', 'weekly')).toBe('2026-01-08');
    expect(addCycle('2026-01-15', 'monthly')).toBe('2026-02-15');
    expect(addCycle('2026-01-15', 'quarterly')).toBe('2026-04-15');
    expect(addCycle('2026-01-15', 'yearly')).toBe('2027-01-15');
  });

  it('clamps month-ends instead of rolling over (Jan 31 -> Feb 28)', () => {
    expect(addCycle('2026-01-31', 'monthly')).toBe('2026-02-28'); // 2026 not a leap year
    expect(addCycle('2024-01-31', 'monthly')).toBe('2024-02-29'); // leap year
    expect(addCycle('2026-01-31', 'quarterly')).toBe('2026-04-30');
    expect(addCycle('2024-02-29', 'yearly')).toBe('2025-02-28'); // leap day -> non-leap year
  });

  it('keeps the original day when the target month is long enough', () => {
    expect(addCycle('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(addCycle('2026-02-28', 'monthly')).toBe('2026-03-28'); // no spurious clamp
  });
});

describe('daysInMonth', () => {
  it('handles month lengths and leap years', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
  });
});
