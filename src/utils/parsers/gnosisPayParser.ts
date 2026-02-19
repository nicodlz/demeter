import type { ParsedTransaction, Currency } from '../../schemas';
import { parsedTransactionSchema } from '../../schemas';

/**
 * Gnosis Pay Parser (CSV)
 *
 * Headers:
 * date,clearing_date,merchant_name,transaction_amount,transaction_currency,
 * billing_amount,billing_currency,transaction_type_description,status,
 * card_last_four,mcc_code,kind
 *
 * Example:
 * 2026-01-22T12:55:48.898Z,2026-01-23T15:42:15.398Z,POPEYES GARE DU,13.48,EUR,13.48,EUR,Purchase (POS),Approved,2206,5814,Payment
 */

const REQUIRED_HEADERS = ['date', 'merchant_name', 'transaction_amount', 'transaction_currency'];

export const canParse = (content: string): boolean => {
  const firstLine = content.split('\n')[0].toLowerCase();
  return REQUIRED_HEADERS.every(h => firstLine.includes(h)) &&
         firstLine.includes('clearing_date');
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

const parseISODate = (isoStr: string): string => {
  try {
    const date = new Date(isoStr);
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

  // Parse headers
  const headers = parseCSVLine(lines[0].toLowerCase());
  const getIndex = (name: string) => headers.indexOf(name);

  const dateIdx = getIndex('date');
  const merchantIdx = getIndex('merchant_name');
  const amountIdx = getIndex('transaction_amount');
  const currencyIdx = getIndex('transaction_currency');
  const billingAmountIdx = getIndex('billing_amount');
  const billingCurrencyIdx = getIndex('billing_currency');
  const statusIdx = getIndex('status');
  const cardIdx = getIndex('card_last_four');
  const kindIdx = getIndex('kind');

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;

      // Only process approved transactions
      const status = statusIdx >= 0 ? values[statusIdx] : '';
      if (status && status.toLowerCase() !== 'approved') continue;

      const date = parseISODate(values[dateIdx]);
      if (!date) continue;

      // Prefer billing amount/currency, fallback to transaction
      let amount = billingAmountIdx >= 0 ? parseFloat(values[billingAmountIdx]) : parseFloat(values[amountIdx]);
      let currency = billingCurrencyIdx >= 0 ? values[billingCurrencyIdx] : values[currencyIdx];

      if (isNaN(amount) || amount === 0) continue;
      if (currency !== 'EUR' && currency !== 'USD') currency = defaultCurrency;

      const merchantName = values[merchantIdx] || '';
      const cardLastFour = cardIdx >= 0 ? values[cardIdx] : undefined;
      const kind = kindIdx >= 0 ? values[kindIdx].toLowerCase() : 'payment';

      // Credit if not a payment/purchase
      const isCredit = kind !== 'payment' && !kind.includes('purchase');

      const tx = {
        date,
        description: merchantName,
        amount,
        currency: currency as Currency,
        merchantName,
        cardLastFour,
        isCredit,
        originalLine: lines[i],
      };
      const validated = parsedTransactionSchema.safeParse(tx);
      if (validated.success) {
        transactions.push(validated.data);
      } else {
        errors.push(`Invalid transaction on line ${i + 1}: ${validated.error.issues.map(issue => issue.message).join(', ')}`);
      }
    } catch {
      errors.push(`Parse error on line ${i + 1}`);
    }
  }

  return { success: transactions.length > 0, transactions, errors };
};

export const gnosisPayParser = {
  provider: 'gnosis_pay' as const,
  canParse,
  parse,
};
