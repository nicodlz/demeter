import type { ParsedTransaction, Currency } from '../../types';

/**
 * Etherfi Parser (CSV)
 *
 * Headers:
 * timestamp,type,description,status,amount USD,card,card holder name,
 * original amount,original currency,cashback earned,category
 *
 * Example:
 * 2025-12-17T17:40:22.883,card_spend,skycoach.gg,CLEARED,36.21,6794,NDLZ,30.37,EUR,1.0863,Digital Goods: Games
 */

const REQUIRED_HEADERS = ['timestamp', 'type', 'description', 'status', 'amount usd'];

export const canParse = (content: string): boolean => {
  const firstLine = content.split('\n')[0].toLowerCase();
  return REQUIRED_HEADERS.every(h => firstLine.includes(h)) &&
         firstLine.includes('card holder');
};

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

const parseTimestamp = (ts: string): string => {
  try {
    // Format: "2025-12-17T17:40:22.883" (no Z)
    const date = new Date(ts.includes('Z') ? ts : ts + 'Z');
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export const parse = (content: string, defaultCurrency: Currency = 'EUR'): {
  success: boolean;
  transactions: ParsedTransaction[];
  errors: string[];
} => {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    return { success: false, transactions: [], errors: ['No data rows found'] };
  }

  // Parse headers (normalize spaces)
  const headers = parseCSVLine(lines[0].toLowerCase().replace(/\s+/g, ' '));
  const getIndex = (name: string) => headers.findIndex(h => h.includes(name));

  const timestampIdx = getIndex('timestamp');
  const typeIdx = getIndex('type');
  const descriptionIdx = getIndex('description');
  const statusIdx = getIndex('status');
  const amountUsdIdx = getIndex('amount usd');
  const cardIdx = getIndex('card');
  const originalAmountIdx = getIndex('original amount');
  const originalCurrencyIdx = getIndex('original currency');

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      if (values.length < 5) continue;

      // Only process cleared transactions
      const status = statusIdx >= 0 ? values[statusIdx] : '';
      if (status && status.toUpperCase() !== 'CLEARED') continue;

      const date = parseTimestamp(values[timestampIdx]);
      if (!date) continue;

      // Use original amount/currency if available, else USD amount
      let amount: number;
      let currency: Currency;

      if (originalAmountIdx >= 0 && originalCurrencyIdx >= 0 &&
          values[originalAmountIdx] && values[originalCurrencyIdx]) {
        amount = parseFloat(values[originalAmountIdx]);
        const curr = values[originalCurrencyIdx].toUpperCase();
        currency = (curr === 'EUR' || curr === 'USD') ? curr as Currency : defaultCurrency;
      } else {
        amount = parseFloat(values[amountUsdIdx]);
        currency = 'USD';
      }

      if (isNaN(amount) || amount === 0) continue;

      const merchantName = values[descriptionIdx] || '';
      const cardLastFour = cardIdx >= 0 ? values[cardIdx] : undefined;
      const txType = typeIdx >= 0 ? values[typeIdx].toLowerCase() : '';

      // Credit if not card_spend
      const isCredit = txType !== 'card_spend';

      transactions.push({
        date,
        description: merchantName,
        amount,
        currency,
        merchantName,
        cardLastFour,
        isCredit,
        originalLine: lines[i],
      });
    } catch {
      errors.push(`Parse error on line ${i + 1}`);
    }
  }

  return { success: transactions.length > 0, transactions, errors };
};

export const etherfiParser = {
  provider: 'etherfi' as const,
  canParse,
  parse,
};
