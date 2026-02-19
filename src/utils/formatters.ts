import type { Currency } from '../schemas';

export const getCurrencySymbol = (currency: Currency): string => {
  return currency === 'EUR' ? '€' : '$';
};

export const formatCurrency = (amount: number, currency: Currency): string => {
  const locale = currency === 'EUR' ? 'fr-FR' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatCurrencyCompact = (amount: number, currency: Currency): string => {
  const symbol = getCurrencySymbol(currency);
  if (Math.abs(amount) >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(1)}k`;
  }
  return `${symbol}${amount.toFixed(0)}`;
};

export const formatDate = (dateString: string, locale = 'en-US'): string => {
  return new Date(dateString).toLocaleDateString(locale);
};
