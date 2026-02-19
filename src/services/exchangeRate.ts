import type { Currency } from '../schemas';

interface ExchangeRateResponse {
  rates: {
    EUR: number;
    USD: number;
  };
}

const CACHE_KEY = 'exchange-rate-cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface CachedRate {
  rate: number;
  timestamp: number;
}

const getFromCache = (): CachedRate | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as CachedRate;
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        return parsed;
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
};

const saveToCache = (rate: number): void => {
  try {
    const data: CachedRate = { rate, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore cache errors
  }
};

export const fetchExchangeRate = async (): Promise<number> => {
  // Check cache first
  const cached = getFromCache();
  if (cached) {
    return cached.rate;
  }

  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }
    const data: ExchangeRateResponse = await response.json();
    const eurRate = data.rates.EUR;
    saveToCache(eurRate);
    return eurRate;
  } catch {
    // Fallback rate if API fails
    return 0.92;
  }
};

export const convertAmount = (
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  usdToEurRate: number
): number => {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  if (fromCurrency === 'USD' && toCurrency === 'EUR') {
    return amount * usdToEurRate;
  }

  if (fromCurrency === 'EUR' && toCurrency === 'USD') {
    return amount / usdToEurRate;
  }

  return amount;
};
