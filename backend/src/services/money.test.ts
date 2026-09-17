import { describe, it, expect } from 'vitest';
import { dollarsToCents, centsToDollars, toMonthlyCents, convertCents } from './money.js';

describe('dollarsToCents / centsToDollars', () => {
  it('converts decimal dollars exactly (no float drift)', () => {
    expect(dollarsToCents(22.99)).toBe(2299);
    expect(dollarsToCents(0.1 + 0.2)).toBe(30); // 0.30000000000000004 -> 30
    expect(dollarsToCents(20)).toBe(2000);
  });

  it('rounds half-dollars up and handles junk input', () => {
    expect(dollarsToCents(10.005)).toBe(1001); // rounds half away from zero via *100 rounding
    expect(dollarsToCents(NaN)).toBe(0);
    expect(dollarsToCents(Infinity)).toBe(0);
  });

  it('round-trips cents to dollars', () => {
    expect(centsToDollars(2299)).toBe(22.99);
    expect(centsToDollars(0)).toBe(0);
    expect(centsToDollars(undefined as unknown as number)).toBe(0);
  });
});

describe('toMonthlyCents', () => {
  it('normalizes each billing cycle', () => {
    expect(toMonthlyCents(1000, 'monthly')).toBe(1000);
    expect(toMonthlyCents(12000, 'yearly')).toBe(1000); // 12000/12
    expect(toMonthlyCents(3000, 'quarterly')).toBe(1000); // 3000/3
    expect(toMonthlyCents(231, 'weekly')).toBe(Math.round(231 * 4.333));
    expect(toMonthlyCents(33, 'daily')).toBe(Math.round(33 * 30.416));
  });

  it('keeps everything an integer', () => {
    for (const cycle of ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']) {
      expect(Number.isInteger(toMonthlyCents(9999, cycle))).toBe(true);
    }
  });
});

describe('convertCents', () => {
  const rates = { USD: 1, EUR: 0.8, INR: 80, GBP: 0.75 };

  it('is a no-op for same currency', () => {
    expect(convertCents(1234, 'USD', 'USD', rates)).toBe(1234);
  });

  it('converts USD to other currencies', () => {
    expect(convertCents(1000, 'USD', 'EUR', rates)).toBe(800); // $10 -> €8
    expect(convertCents(1000, 'USD', 'INR', rates)).toBe(80000); // $10 -> ₹800
  });

  it('converts between non-USD currencies through the USD base', () => {
    expect(convertCents(80000, 'INR', 'USD', rates)).toBe(1000); // ₹800 -> $10
    expect(convertCents(80000, 'INR', 'EUR', rates)).toBe(800); // ₹800 -> €8
  });

  it('falls back to rate 1 for unknown currencies', () => {
    expect(convertCents(500, 'XXX', 'USD', rates)).toBe(500);
    expect(convertCents(500, 'USD', 'YYY', rates)).toBe(500);
  });
});
