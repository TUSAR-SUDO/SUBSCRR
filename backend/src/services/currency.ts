export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
  source: 'live' | 'cached' | 'fallback';
}

// Resilient default rates relative to 1 USD
const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 154.5,
  INR: 83.5,
  CHF: 0.90,
  SGD: 1.35,
  CNY: 7.23,
  BRL: 5.15,
  MXN: 16.8,
  AED: 3.67,
  NZD: 1.66,
  SEK: 10.75,
};

let cachedRates: Record<string, number> = { ...FALLBACK_RATES };
let lastFetchTime = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function fetchExchangeRates(base = 'USD'): Promise<ExchangeRates> {
  const now = Date.now();

  // If cached and fresh, return cached
  if (now - lastFetchTime < CACHE_TTL_MS && Object.keys(cachedRates).length > 0) {
    return {
      base: 'USD',
      date: new Date(lastFetchTime).toISOString(),
      rates: normalizeToBase(cachedRates, base),
      source: 'cached',
    };
  }

  try {
    // Attempt live fetch from open reliable exchange rate API with 3s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data && data.rates) {
        cachedRates = { ...FALLBACK_RATES, ...data.rates };
        lastFetchTime = now;
        return {
          base,
          date: new Date().toISOString(),
          rates: normalizeToBase(cachedRates, base),
          source: 'live',
        };
      }
    }
  } catch {
    // Network unavailable or timed out - fall back gracefully
  }

  // Fallback
  return {
    base,
    date: new Date().toISOString(),
    rates: normalizeToBase(cachedRates, base),
    source: 'fallback',
  };
}

function normalizeToBase(rates: Record<string, number>, targetBase: string): Record<string, number> {
  const upperTarget = targetBase.toUpperCase();
  if (upperTarget === 'USD' || !rates[upperTarget]) {
    return rates;
  }

  const baseToUsdRate = rates[upperTarget];
  const converted: Record<string, number> = {};

  for (const [curr, rate] of Object.entries(rates)) {
    converted[curr] = Number((rate / baseToUsdRate).toFixed(6));
  }
  converted[upperTarget] = 1.0;

  return converted;
}

export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<{
  amount: number;
  from: string;
  to: string;
  rate: number;
  convertedAmount: number;
  formatted: string;
}> {
  const ratesData = await fetchExchangeRates('USD');
  const rates = ratesData.rates;

  const upperFrom = from.toUpperCase();
  const upperTo = to.toUpperCase();

  const rateFrom = rates[upperFrom] || 1.0;
  const rateTo = rates[upperTo] || 1.0;

  // Conversion: amount in USD = amount / rateFrom; amount in TO = amountInUsd * rateTo
  const rate = rateTo / rateFrom;
  const convertedAmount = Number((amount * rate).toFixed(2));

  // Format with currency symbol
  const symbolMap: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    INR: '₹',
    CAD: 'CA$',
    AUD: 'A$',
    CHF: 'CHF ',
  };

  const symbol = symbolMap[upperTo] || `${upperTo} `;
  const formatted = `${symbol}${convertedAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return {
    amount,
    from: upperFrom,
    to: upperTo,
    rate: Number(rate.toFixed(4)),
    convertedAmount,
    formatted,
  };
}
