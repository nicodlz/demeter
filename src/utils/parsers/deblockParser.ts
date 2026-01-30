import type { ParsedTransaction, Currency } from '../../types';
import { parsedTransactionSchema } from '../../schemas';

/**
 * Deblock Parser
 *
 * Input format (text copied from Deblock):
 * "DateValeurOpérationDébit1 octobre 202529 septembre 2025Prélèvement automatique "DIGI PORTUGAL LDA"7,005 octobre 20254 octobre 2025Paiement Carte "Tesla"12,78"
 */

const FRENCH_MONTHS: Record<string, string> = {
  'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03',
  'avril': '04', 'mai': '05', 'juin': '06', 'juillet': '07',
  'août': '08', 'aout': '08', 'septembre': '09', 'octobre': '10',
  'novembre': '11', 'décembre': '12', 'decembre': '12',
};

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

const parseFrenchDate = (day: string, month: string, year: string): string => {
  const monthNum = FRENCH_MONTHS[month.toLowerCase()];
  if (!monthNum) return '';
  return `${year}-${monthNum}-${day.padStart(2, '0')}`;
};

export const parse = (content: string, defaultCurrency: Currency = 'EUR'): {
  success: boolean;
  transactions: ParsedTransaction[];
  errors: string[];
} => {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  // Match: date1 + date2 + operation + amount
  // Example: "1 octobre 202529 septembre 2025Prélèvement automatique "DIGI PORTUGAL LDA"7,00"
  const monthPattern = 'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';
  const txRegex = new RegExp(
    `(\\d{1,2})\\s+(${monthPattern})\\s+(\\d{4})(\\d{1,2})\\s+(${monthPattern})\\s+(\\d{4})((?:Prélèvement automatique|Paiement Carte|Cashback|Virement)[^0-9]*(?:"[^"]*")?[^0-9]*)(\\d+,\\d{2})`,
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

      // Credits: Cashback or Virement without quotes (incoming)
      const isCredit = operation.toLowerCase().includes('cashback') ||
                       (operation.toLowerCase().includes('virement') && !merchantMatch);

      const tx = {
        date,
        description: operation.replace(/"/g, '').trim(),
        amount,
        currency: defaultCurrency,
        merchantName,
        isCredit,
        originalLine: fullMatch,
      };
      const validated = parsedTransactionSchema.safeParse(tx);
      if (validated.success) {
        transactions.push(validated.data);
      } else {
        errors.push(`Invalid transaction: ${validated.error.issues.map(i => i.message).join(', ')}`);
      }
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
