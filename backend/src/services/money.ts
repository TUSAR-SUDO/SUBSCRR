// Shared money-math helpers used by analytics, alerts, and admin stats.
//
// FINANCIAL INVARIANT: all monetary values are stored and accumulated as
// INTEGER CENTS (`*_cents` columns). Floating-point dollars are only allowed
// at the API boundary (request parsing / response formatting) and in the UI.

/** Decimal dollars -> integer cents (safe: 22.99 -> 2299, never 2298.99…). */
export function dollarsToCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

/** Integer cents -> decimal dollars for API responses / display. */
export function centsToDollars(cents: number): number {
  return (cents || 0) / 100;
}

/** Normalize any billing cycle amount (in cents) to a monthly cost in cents. */
export function toMonthlyCents(amountCents: number, cycle: string): number {
  switch (cycle) {
    case 'daily':
      return Math.round(amountCents * 30.416);
    case 'weekly':
      return Math.round(amountCents * 4.333);
    case 'monthly':
      return amountCents;
    case 'quarterly':
      return Math.round(amountCents / 3.0);
    case 'yearly':
      return Math.round(amountCents / 12.0);
    default:
      return amountCents;
  }
}

export interface RateTable {
  rates: Record<string, number>; // units of currency per 1 USD
}

/**
 * Convert an integer-cent amount between currencies using USD-based rates.
 * rates: e.g. { USD: 1, EUR: 0.92, INR: 83.5 } (units per 1 USD).
 */
export function convertCents(cents: number, from: string, to: string, rates: Record<string, number>): number {
  const f = (from || 'USD').toUpperCase();
  const t = (to || 'USD').toUpperCase();
  if (f === t) return cents;
  const rateFrom = rates[f] || 1;
  const rateTo = rates[t] || 1;
  return Math.round((cents / rateFrom) * rateTo);
}

/** Canonical category palette shared across analytics + admin views. */
export const categoryColors: Record<string, string> = {
  'AI Tools': '#10A37F',
  'Entertainment': '#E50914',
  'Music': '#1DB954',
  'Development': '#24292F',
  'Design': '#F24E1E',
  'Cloud Storage': '#0071E3',
  'Productivity': '#6366F1',
  'Health & Fitness': '#10B981',
  'Gaming': '#8B5CF6',
  'Utilities': '#F59E0B',
  'Other': '#6B7280',
};

export function categoryColor(category: string): string {
  return categoryColors[category] || '#FF2500';
}
