import type { Currency } from "@/schemas";
import { parseCalendarDate } from "./date";

export const getCurrencySymbol = (currency: Currency): string => {
  return currency === "EUR" ? "€" : "$";
};

export const formatCurrency = (amount: number, currency: Currency): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const locale = currency === "EUR" ? "fr-FR" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(safeAmount);
};

export const formatCurrencyCompact = (
  amount: number,
  currency: Currency,
): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const symbol = getCurrencySymbol(currency);
  const sign = safeAmount < 0 ? "-" : "";
  const absolute = Math.abs(safeAmount);
  if (absolute >= 1000) {
    return `${sign}${symbol}${(absolute / 1000).toFixed(1)}k`;
  }
  return `${sign}${symbol}${absolute.toFixed(0)}`;
};

export const formatDate = (dateString: string, locale = "en-US"): string => {
  return parseCalendarDate(dateString).toLocaleDateString(locale);
};
