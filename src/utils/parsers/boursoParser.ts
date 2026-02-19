import type { ParsedTransaction, Currency } from '@/schemas';
import { parseDateDDMMYYYY, cleanLabel, createTransaction } from './parserUtils';

/**
 * Boursorama Parser
 *
 * Handles complex Bourso PDF copy-paste format where:
 * - Dates are DD/MM/YYYY
 * - Amounts may be concatenated with dates (e.g., "02/09/202513,90")
 * - Transactions span multiple lines
 * - Transaction types: CARTE, VIR INST, VIR SEPA, PRLV SEPA, AVOIR
 */

export const canParse = (content: string): boolean => {
  const hasDateFormat = /\d{2}\/\d{2}\/\d{4}/.test(content);
  const hasKeywords = content.includes('VIR SEPA') ||
                      content.includes('VIR INST') ||
                      content.includes('PRLV SEPA') ||
                      content.includes('CARTE') ||
                      content.includes('AVOIR');
  return hasDateFormat && hasKeywords;
};

interface RawTransaction {
  date: string;
  description: string;
  debit?: number;
  credit?: number;
  originalLines: string[];
}

export const parse = (content: string, defaultCurrency: Currency = 'EUR'): {
  success: boolean;
  transactions: ParsedTransaction[];
  errors: string[];
} => {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  const normalizedContent = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = normalizedContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const skipPatterns = [
    /^date$/i, /^libellé$/i, /^valeur$/i, /^débit$/i, /^crédit$/i,
    /^solde/i, /^page\s+\d+/i, /^relevé/i, /^compte/i, /^iban/i, /^bic/i,
    /^période/i, /^du\s+\d/i, /^au\s+\d/i,
    /^\d+\s*€$/, /^-?\d[\d\s]*,\d{2}\s*€?$/,
  ];

  const rawTransactions: RawTransaction[] = [];
  let currentTransaction: RawTransaction | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (skipPatterns.some(p => p.test(line))) continue;
    if (line.length < 5) continue;

    const startsWithDate = /^(\d{2}\/\d{2}\/\d{4})/.test(line);

    if (startsWithDate) {
      if (currentTransaction) rawTransactions.push(currentTransaction);

      const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})/);
      if (!dateMatch) continue;

      const date = dateMatch[1];
      let restOfLine = line.substring(10).trim();

      let amount: number | undefined;
      let isDebit = true;
      let description = restOfLine;

      // Pattern 1: Amount concatenated with date at end (e.g., "02/09/202513,90")
      const concatPattern = /(\d{2}\/\d{2}\/\d{4})(\d[\d\s]*,\d{2})\s*$/;
      const concatMatch = restOfLine.match(concatPattern);

      if (concatMatch) {
        const amountStr = concatMatch[2].replace(/\s/g, '').replace(',', '.');
        amount = parseFloat(amountStr);
        description = restOfLine.replace(concatPattern, '').trim();
      } else {
        // Pattern 2: Amount at end
        const amountEndPattern = /(\d[\d\s]*,\d{2})\s*$/;
        const amountMatch = restOfLine.match(amountEndPattern);
        if (amountMatch) {
          const amountStr = amountMatch[1].replace(/\s/g, '').replace(',', '.');
          amount = parseFloat(amountStr);
          description = restOfLine.replace(amountEndPattern, '').trim();
          description = description.replace(/\d{2}\/\d{2}\/\d{4}\s*$/, '').trim();
        }
      }

      if (description.startsWith('VIR INST') ||
          description.startsWith('VIR SEPA') ||
          description.includes('AVOIR')) {
        if (description.includes('EMIS')) {
          isDebit = true;
        } else if (description.includes('AVOIR')) {
          isDebit = false;
        } else if (!description.includes('CARTE') && !description.includes('PRLV')) {
          isDebit = false;
        }
      }

      currentTransaction = {
        date,
        description,
        debit: isDebit && amount ? amount : undefined,
        credit: !isDebit && amount ? amount : undefined,
        originalLines: [line],
      };
    } else if (currentTransaction) {
      // Continuation line
      const justAmountMatch = line.match(/^(\d[\d\s]*,\d{2})\s*$/);
      if (justAmountMatch && !currentTransaction.debit && !currentTransaction.credit) {
        const amountStr = justAmountMatch[1].replace(/\s/g, '').replace(',', '.');
        const amt = parseFloat(amountStr);
        if (!isNaN(amt)) {
          const desc = currentTransaction.description.toUpperCase();
          const isCredit = (desc.includes('VIR INST') || desc.includes('VIR SEPA')) &&
                           !desc.includes('EMIS') && !desc.includes('CARTE') && !desc.includes('PRLV');
          if (isCredit) currentTransaction.credit = amt;
          else currentTransaction.debit = amt;
          currentTransaction.originalLines.push(line);
          continue;
        }
      }

      const dateAmountMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})(\d[\d\s]*,\d{2})$/);
      if (dateAmountMatch && !currentTransaction.debit && !currentTransaction.credit) {
        const amountStr = dateAmountMatch[2].replace(/\s/g, '').replace(',', '.');
        const amt = parseFloat(amountStr);
        if (!isNaN(amt)) {
          const desc = currentTransaction.description.toUpperCase();
          const isCredit = (desc.includes('VIR INST') || desc.includes('VIR SEPA')) &&
                           !desc.includes('EMIS') && !desc.includes('CARTE') && !desc.includes('PRLV');
          if (isCredit) currentTransaction.credit = amt;
          else currentTransaction.debit = amt;
          currentTransaction.originalLines.push(line);
          continue;
        }
      }

      currentTransaction.description += ' ' + line;
      currentTransaction.originalLines.push(line);
    }
  }

  if (currentTransaction) rawTransactions.push(currentTransaction);

  for (const raw of rawTransactions) {
    if (!raw.debit && !raw.credit) {
      const amountInDesc = raw.description.match(/(\d[\d\s]*,\d{2})/);
      if (amountInDesc) {
        const amountStr = amountInDesc[1].replace(/\s/g, '').replace(',', '.');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount) && amount > 0) {
          raw.debit = amount;
          raw.description = raw.description.replace(amountInDesc[0], '').trim();
        }
      }
    }

    if (!raw.debit && !raw.credit) {
      errors.push(`No amount found: ${raw.description.substring(0, 50)}...`);
      continue;
    }

    const date = parseDateDDMMYYYY(raw.date);
    if (!date) {
      errors.push(`Invalid date: ${raw.date}`);
      continue;
    }

    const amount = raw.debit || raw.credit || 0;
    const isCredit = !!raw.credit;
    const description = cleanLabel(raw.description);
    const merchantName = extractMerchantName(raw.description);
    const cardMatch = raw.description.match(/CB\*(\d{4})/);
    const cardLastFour = cardMatch ? cardMatch[1] : undefined;

    const tx = createTransaction(
      {
        date,
        description: description || raw.description,
        amount,
        currency: defaultCurrency,
        merchantName,
        cardLastFour,
        isCredit,
        originalLine: raw.originalLines.join('\n'),
      },
      errors
    );
    if (tx) transactions.push(tx);
  }

  return { success: transactions.length > 0, transactions, errors };
};

function extractMerchantName(description: string): string {
  const upper = description.toUpperCase();

  if (upper.includes('CARTE')) {
    const m = description.match(/CARTE\s+\d{2}\/\d{2}\/\d{2}\s+([A-Z0-9*\s]+?)(?:\s+CB|\s*$)/i);
    if (m) return m[1].replace(/\s+/g, ' ').trim();
  }
  if (upper.includes('PRLV SEPA')) {
    const parts = description.replace(/PRLV SEPA/i, '').trim().split(/\s+/);
    if (parts.length > 0) return parts.slice(0, 2).join(' ');
  }
  if (upper.includes('VIR SEPA') || upper.includes('VIR INST')) {
    const m = description.match(/VIR\s+(SEPA|INST)\s+(EMIS|RECU)?\s*(.+)/i);
    if (m && m[3]) return m[3].trim().split(/\s+/).slice(0, 3).join(' ');
  }
  if (upper.includes('AVOIR')) {
    const m = description.match(/AVOIR\s+(.+)/i);
    if (m) return m[1].split(/\s+/).slice(0, 2).join(' ');
  }

  return description.split(/\s+/).slice(0, 2).join(' ');
}

export const boursoParser = {
  provider: 'bourso' as const,
  canParse,
  parse,
};
