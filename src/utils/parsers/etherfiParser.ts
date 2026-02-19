import type { ParsedTransaction, Currency } from '@/schemas';
import { parseCSVLine, parseISODate, createTransaction } from './parserUtils';

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

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      if (values.length < 5) continue;

      const status = statusIdx >= 0 ? values[statusIdx] : '';
      if (status && status.toUpperCase() !== 'CLEARED') continue;

      const date = parseISODate(values[timestampIdx]);
      if (!date) continue;

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
      const isCredit = txType !== 'card_spend';

      const tx = createTransaction(
        {
          date,
          description: merchantName,
          amount,
          currency,
          merchantName,
          cardLastFour,
          isCredit,
          originalLine: lines[i],
        },
        errors
      );
      if (tx) transactions.push(tx);
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
