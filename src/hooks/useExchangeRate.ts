import { useState, useEffect, useCallback } from 'react';
import { fetchExchangeRate, convertAmount } from '../services/exchangeRate';
import type { Currency } from '../schemas';

interface UseExchangeRateResult {
  rate: number;
  loading: boolean;
  error: string | null;
  convert: (amount: number, fromCurrency: Currency, toCurrency: Currency) => number;
}

export const useExchangeRate = (): UseExchangeRateResult => {
  const [rate, setRate] = useState<number>(0.92); // Default fallback
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadRate = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedRate = await fetchExchangeRate();
        if (mounted) {
          setRate(fetchedRate);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch rate');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadRate();

    return () => {
      mounted = false;
    };
  }, []);

  const convert = useCallback(
    (amount: number, fromCurrency: Currency, toCurrency: Currency): number => {
      return convertAmount(amount, fromCurrency, toCurrency, rate);
    },
    [rate]
  );

  return { rate, loading, error, convert };
};
