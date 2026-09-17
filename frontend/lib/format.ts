// Central money formatting for the app. All display amounts go through here
// so currency symbols, grouping, and decimal rules stay consistent and
// locale-correct (Intl.NumberFormat), replacing hand-rolled symbol maps.

const CURRENCY_LOCALES: Record<string, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  INR: 'en-IN',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
};

// Some currencies share symbols (USD/CAD/AUD all "$"); qualified symbols
// disambiguate without long-form currency codes everywhere.
const CURRENCY_DISPLAY: Record<string, 'symbol' | 'narrowSymbol'> = {
  CAD: 'narrowSymbol',
  AUD: 'narrowSymbol',
};

export function currencyLocale(currency: string | undefined | null): string {
  return CURRENCY_LOCALES[(currency || 'USD').toUpperCase()] || 'en-US';
}

/**
 * Format a decimal amount in the given currency.
 * e.g. formatMoney(1234.5, 'EUR') -> "1.234,50 €"
 */
export function formatMoney(amount: number, currency: string | undefined | null = 'USD'): string {
  const cur = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat(currencyLocale(cur), {
      style: 'currency',
      currency: cur,
      currencyDisplay: CURRENCY_DISPLAY[cur] || 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    // Unknown currency code: fall back to a plain grouped number.
    return `${cur} ${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Format just the currency symbol for compact UI spots that split the symbol
 * and number into separate elements.
 */
export function currencySymbol(currency: string | undefined | null = 'USD'): string {
  const cur = (currency || 'USD').toUpperCase();
  try {
    const parts = new Intl.NumberFormat(currencyLocale(cur), {
      style: 'currency',
      currency: cur,
      currencyDisplay: CURRENCY_DISPLAY[cur] || 'symbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value || cur;
  } catch {
    return cur;
  }
}
