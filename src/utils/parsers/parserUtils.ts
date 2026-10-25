import type { ParsedTransaction, Currency } from "@/schemas";
import { isValidCalendarDate, toCalendarDate } from "@/utils/date";

// ============================================================
// Date parsing utilities
// ============================================================

export const parseDateDDMMYYYY = (dateStr: string): string | null => {
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  return isValidCalendarDate(iso) ? iso : null;
};

export const parseISODate = (dateStr: string): string | null => {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  return toCalendarDate(dateStr);
};

export const FRENCH_MONTHS: Record<string, number> = {
  janvier: 1,
  février: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  août: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  décembre: 12,
};

export const FRENCH_MONTHS_PATTERN = Object.keys(FRENCH_MONTHS).join("|");

export const parseFrenchDate = (
  day: string,
  month: string,
  year: string,
): string | null => {
  const monthNum = FRENCH_MONTHS[month.toLowerCase()];
  if (!monthNum) return null;
  const iso = `${year}-${String(monthNum).padStart(2, "0")}-${day.padStart(2, "0")}`;
  return isValidCalendarDate(iso) ? iso : null;
};

export const frenchMonthToNumber = (month: string): number | null => {
  return FRENCH_MONTHS[month.toLowerCase()] ?? null;
};

// ============================================================
// Amount parsing utilities
// ============================================================

/** Parse French-formatted amounts (e.g., "1 234,56" or "1234.56") */
export const parseAmount = (str: string): number => {
  if (!str) return 0;
  // Remove spaces, replace comma with dot
  const cleaned = str.replace(/\s/g, "").replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : Math.abs(val);
};

/** Strict amount parsing — returns 0 only if truly unparseable */
export const parseAmountStrict = (str: string): number => {
  if (!str) return 0;
  // Remove non-numeric chars except comma, dot, minus
  const cleaned = str.replace(/[^\d,.-]/g, "").replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : Math.abs(val);
};

// ============================================================
// CSV parsing
// ============================================================

/** Parse a CSV line respecting quoted fields */
export const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

// ============================================================
// Text cleaning
// ============================================================

export const cleanLabel = (label: string): string => {
  return label
    .replace(/\s+/g, " ")
    .replace(/CB\*\d{4}\s*/g, "")
    .replace(/CARTE \d{2}\/\d{2}\s*/g, "")
    .trim();
};

// ============================================================
// Transaction factory
// ============================================================

interface CreateTransactionInput {
  date: string;
  description: string;
  amount: number;
  currency: Currency;
  merchantName?: string;
  cardLastFour?: string;
  isCredit?: boolean;
  originalLine?: string;
}

export const createTransaction = (
  input: CreateTransactionInput,
  errors: string[],
): ParsedTransaction | null => {
  try {
    if (!input.date || !input.description || input.amount === 0) return null;

    return {
      date: input.date,
      description: input.description,
      amount: input.isCredit ? input.amount : -input.amount,
      currency: input.currency,
      merchantName: input.merchantName,
      cardLastFour: input.cardLastFour,
      isCredit: input.isCredit ?? false,
      originalLine: input.originalLine,
    };
  } catch (err) {
    errors.push(`Failed to create transaction: ${err}`);
    return null;
  }
};
