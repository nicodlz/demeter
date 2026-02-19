import type { ParsedTransaction, Currency } from '../../types';
import { parseFrenchDate, FRENCH_MONTHS, FRENCH_MONTHS_PATTERN, createTransaction } from './parserUtils';

/**
 * Deblock Parser
 *
 * Input format (text copied from Deblock):
 * "DateValeurOpérationDébit1 octobre 202529 septembre 2025Prélèvement automatique "DIGI PORTUGAL LDA"7,005 octobre 20254 octobre 2025Paiement Carte "Tesla"12,78"
 */

export const canParse = (content: string): boolean => {
  const hasMonths = Object.keys(FRENCH_MONTHS).some(m =>
    content.toLowerCase().includes(m)
  );
  const hasKeywords = content.includes('Prélèvement') ||
                      content.includes('Paiement Carte') ||
                      content.includes('Cashback') ||
                      content.includes('Virement');
  return hasMonths && hasKeywords;
};

export const parse = (content: string, defaultCurrency: Currency = 'EUR'): {
  success: boolean;
  transactions: ParsedTransaction[];
  errors: string[];
} => {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  const txRegex = new RegExp(
    `(\\d{1,2})\\s+(${FRENCH_MONTHS_PATTERN})\\s+(\\d{4})(\\d{1,2})\\s+(${FRENCH_MONTHS_PATTERN})\\s+(\\d{4})((?:Prélèvement automatique|Paiement Carte|Cashback|Virement)[^0-9]*(?:"[^"]*")?[^0-9]*)(\\d+,\\d{2})`,
    'gi'
  );

  let match;
  while ((match = txRegex.exec(content)) !== null) {
    try {
      const [fullMatch, day1, month1, year1, , , , operationRaw, amountStr] = match;

      const date = parseFrenchDate(day1, month1, year1);
      if (!date) continue;

      const amount = parseFloat(amountStr.replace(',', '.'));
      if (amount === 0) continue;

      const operation = operationRaw.trim();
      const merchantMatch = operation.match(/"([^"]+)"/);
      const merchantName = merchantMatch ? merchantMatch[1].trim() : operation;

      const isCredit = operation.toLowerCase().includes('cashback') ||
                       (operation.toLowerCase().includes('virement') && !merchantMatch);

      const tx = createTransaction(
        {
          date,
          description: operation.replace(/"/g, '').trim(),
          amount,
          currency: defaultCurrency,
          merchantName,
          isCredit,
          originalLine: fullMatch,
        },
        errors
      );
      if (tx) transactions.push(tx);
    } catch {
      errors.push(`Parse error: ${match[0].substring(0, 50)}...`);
    }
  }

  return { success: transactions.length > 0, transactions, errors };
};

export const deblockParser = {
  provider: 'deblock' as const,
  canParse,
  parse,
};
