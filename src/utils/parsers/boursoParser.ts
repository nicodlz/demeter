import type { ParsedTransaction, Currency } from '../../types';
import { parsedTransactionSchema } from '../../schemas';

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
  // Must have DD/MM/YYYY dates
  const hasDateFormat = /\d{2}\/\d{2}\/\d{4}/.test(content);
  // Must have Bourso-specific keywords
  const hasKeywords = content.includes('VIR SEPA') ||
                      content.includes('VIR INST') ||
                      content.includes('PRLV SEPA') ||
                      content.includes('CARTE') ||
                      content.includes('AVOIR');
  return hasDateFormat && hasKeywords;
};

const parseDateToISO = (dateStr: string): string => {
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return '';
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
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

  // Normalize content - remove excessive whitespace but preserve structure
  const normalizedContent = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Strategy: Find all transaction patterns
  // A transaction line looks like:
  // DD/MM/YYYY <TYPE> <DESCRIPTION> [DD/MM/YYYY]<AMOUNT>
  // Where <AMOUNT> might be concatenated with the next date

  // Split by lines
  const lines = normalizedContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Skip header lines (before first transaction)
  const skipPatterns = [
    /^date$/i,
    /^libellé$/i,
    /^valeur$/i,
    /^débit$/i,
    /^crédit$/i,
    /^solde/i,
    /^page\s+\d+/i,
    /^relevé/i,
    /^compte/i,
    /^iban/i,
    /^bic/i,
    /^période/i,
    /^du\s+\d/i,
    /^au\s+\d/i,
    /^\d+\s*€$/,  // Balance amounts
    /^-?\d[\d\s]*,\d{2}\s*€?$/,  // Standalone amounts
  ];

  const rawTransactions: RawTransaction[] = [];
  let currentTransaction: RawTransaction | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip obvious header/footer lines
    if (skipPatterns.some(p => p.test(line))) continue;
    if (line.length < 5) continue;

    // Check if line starts with a date (new transaction)
    const startsWithDate = /^(\d{2}\/\d{2}\/\d{4})/.test(line);

    if (startsWithDate) {
      // Save previous transaction
      if (currentTransaction) {
        rawTransactions.push(currentTransaction);
      }

      // Parse the transaction line
      // Pattern: DATE TYPE DESCRIPTION [DATE]AMOUNT
      // The amount might be concatenated: "02/09/202513,90" means date "02/09/2025" and amount "13,90"

      const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})/);
      if (!dateMatch) continue;

      const date = dateMatch[1];
      let restOfLine = line.substring(10).trim();

      // Try to extract amount - it might be at the end, possibly concatenated with a date
      // Look for patterns like:
      // - "DD/MM/YYYY123,45" (date + amount)
      // - "123,45" (just amount)
      // - "1 234,56" (amount with space thousands separator)

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
        // Pattern 2: Amount at end with possible date before it
        // "CARTE 30/08/25 PAYPAL CB*8897 02/09/2025 13,90"
        const amountEndPattern = /(\d[\d\s]*,\d{2})\s*$/;
        const amountMatch = restOfLine.match(amountEndPattern);

        if (amountMatch) {
          const amountStr = amountMatch[1].replace(/\s/g, '').replace(',', '.');
          amount = parseFloat(amountStr);
          description = restOfLine.replace(amountEndPattern, '').trim();
          // Remove trailing date if present
          description = description.replace(/\d{2}\/\d{2}\/\d{4}\s*$/, '').trim();
        }
      }

      // Check if this is a credit (incoming money)
      if (description.startsWith('VIR INST') ||
          description.startsWith('VIR SEPA') ||
          description.includes('AVOIR')) {
        // These could be credits, but we need more context
        // For VIR, if it's "VIR SEPA EMIS" it's a debit (outgoing)
        // If it's "VIR SEPA RECU" or just "VIR SEPA <name>" it's likely a credit
        if (description.includes('EMIS')) {
          isDebit = true;
        } else if (description.includes('AVOIR')) {
          isDebit = false;
        } else if (!description.includes('CARTE') && !description.includes('PRLV')) {
          // Virements without EMIS are usually credits (incoming)
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
      // This is a continuation line for the current transaction
      // Could be additional description or the amount

      // Check if this line contains just an amount
      const justAmountMatch = line.match(/^(\d[\d\s]*,\d{2})\s*$/);
      if (justAmountMatch && !currentTransaction.debit && !currentTransaction.credit) {
        const amountStr = justAmountMatch[1].replace(/\s/g, '').replace(',', '.');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount)) {
          // Determine if debit or credit based on description
          const desc = currentTransaction.description.toUpperCase();
          const isCredit = (desc.includes('VIR INST') || desc.includes('VIR SEPA')) &&
                           !desc.includes('EMIS') && !desc.includes('CARTE') && !desc.includes('PRLV');

          if (isCredit) {
            currentTransaction.credit = amount;
          } else {
            currentTransaction.debit = amount;
          }
          currentTransaction.originalLines.push(line);
          continue;
        }
      }

      // Check if line has date concatenated with amount (from next transaction bleeding in)
      const dateAmountMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})(\d[\d\s]*,\d{2})$/);
      if (dateAmountMatch && !currentTransaction.debit && !currentTransaction.credit) {
        const amountStr = dateAmountMatch[2].replace(/\s/g, '').replace(',', '.');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount)) {
          const desc = currentTransaction.description.toUpperCase();
          const isCredit = (desc.includes('VIR INST') || desc.includes('VIR SEPA')) &&
                           !desc.includes('EMIS') && !desc.includes('CARTE') && !desc.includes('PRLV');

          if (isCredit) {
            currentTransaction.credit = amount;
          } else {
            currentTransaction.debit = amount;
          }
          currentTransaction.originalLines.push(line);
          continue;
        }
      }

      // Otherwise, append to description
      currentTransaction.description += ' ' + line;
      currentTransaction.originalLines.push(line);
    }
  }

  // Don't forget the last transaction
  if (currentTransaction) {
    rawTransactions.push(currentTransaction);
  }

  // Convert raw transactions to ParsedTransactions
  for (const raw of rawTransactions) {
    // Skip transactions without amounts
    if (!raw.debit && !raw.credit) {
      // Try one more time to extract amount from description
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

    const date = parseDateToISO(raw.date);
    if (!date) {
      errors.push(`Invalid date: ${raw.date}`);
      continue;
    }

    const amount = raw.debit || raw.credit || 0;
    const isCredit = !!raw.credit;

    // Clean up description - remove dates and excessive spaces
    let description = raw.description
      .replace(/\d{2}\/\d{2}\/\d{4}/g, '')  // Remove full dates
      .replace(/\d{2}\/\d{2}\/\d{2}/g, '')  // Remove short dates (DD/MM/YY)
      .replace(/CB\*\d+/g, '')              // Remove card numbers
      .replace(/\s+/g, ' ')                 // Normalize spaces
      .trim();

    // Extract merchant name
    let merchantName = extractMerchantName(raw.description);

    // Extract card last four digits
    const cardMatch = raw.description.match(/CB\*(\d{4})/);
    const cardLastFour = cardMatch ? cardMatch[1] : undefined;

    const tx = {
      date,
      description: description || raw.description,
      amount,
      currency: defaultCurrency,
      merchantName,
      cardLastFour,
      isCredit,
      originalLine: raw.originalLines.join('\n'),
    };
    const validated = parsedTransactionSchema.safeParse(tx);
    if (validated.success) {
      transactions.push(validated.data);
    } else {
      errors.push(`Invalid transaction: ${validated.error.issues.map(i => i.message).join(', ')}`);
    }
  }

  return { success: transactions.length > 0, transactions, errors };
};

function extractMerchantName(description: string): string {
  const upper = description.toUpperCase();

  // CARTE transactions: "CARTE DD/MM/YY MERCHANT CB*XXXX"
  if (upper.includes('CARTE')) {
    const carteMatch = description.match(/CARTE\s+\d{2}\/\d{2}\/\d{2}\s+([A-Z0-9*\s]+?)(?:\s+CB|\s*$)/i);
    if (carteMatch) {
      return carteMatch[1].replace(/\s+/g, ' ').trim();
    }
  }

  // PRLV SEPA: "PRLV SEPA MERCHANT"
  if (upper.includes('PRLV SEPA')) {
    const parts = description.replace(/PRLV SEPA/i, '').trim().split(/\s+/);
    if (parts.length > 0) {
      return parts.slice(0, 2).join(' ');
    }
  }

  // VIR SEPA/VIR INST: "VIR SEPA EMIS MERCHANT" or "VIR INST RECU MERCHANT"
  if (upper.includes('VIR SEPA') || upper.includes('VIR INST')) {
    const virMatch = description.match(/VIR\s+(SEPA|INST)\s+(EMIS|RECU)?\s*(.+)/i);
    if (virMatch && virMatch[3]) {
      const rest = virMatch[3].trim();
      // Take first few words as merchant
      const words = rest.split(/\s+/).slice(0, 3);
      return words.join(' ');
    }
  }

  // AVOIR: "AVOIR MERCHANT"
  if (upper.includes('AVOIR')) {
    const avoirMatch = description.match(/AVOIR\s+(.+)/i);
    if (avoirMatch) {
      return avoirMatch[1].split(/\s+/).slice(0, 2).join(' ');
    }
  }

  // Fallback: first few words
  return description.split(/\s+/).slice(0, 2).join(' ');
}

export const boursoParser = {
  provider: 'bourso' as const,
  canParse,
  parse,
};
