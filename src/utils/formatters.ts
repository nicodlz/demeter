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

// Returns "2026-02" from a Date
export const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// Returns "Feb '26" from a "2026-02" key
export const getMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

// Returns "Feb '26" directly from a Date
export const formatMonthShort = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

// Returns "Feb 2026" from a "2026-02" key (for selectors / long labels)
export const formatMonthFull = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};
