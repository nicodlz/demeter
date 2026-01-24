import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { TextItem as PdfTextItem } from 'pdfjs-dist/types/src/display/api';
import type { ParsedTransaction, Currency } from '../../types';

// Set worker source for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

interface RawTransaction {
  date: string;
  description: string[];
  valueDate: string;
  debit?: number;
  credit?: number;
}

/**
 * Parse a Boursorama PDF bank statement
 *
 * PDF structure:
 * - Columns: Date opération | Libellé | Valeur | Débit | Crédit
 * - Débit = money OUT (expenses) - what we want
 * - Crédit = money IN (income/refunds) - to be ignored
 */
export const parseBoursoramaPdf = async (
  file: File,
  defaultCurrency: Currency = 'EUR'
): Promise<{
  success: boolean;
  transactions: ParsedTransaction[];
  errors: string[];
}> => {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // Process each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      // Extract text items with positions
      const items: TextItem[] = textContent.items
        .filter((item): item is PdfTextItem =>
          'str' in item && 'transform' in item
        )
        .map((item) => ({
          str: item.str,
          x: item.transform[4],
          y: viewport.height - item.transform[5], // Flip Y coordinate
          width: item.width,
        }));

      // Find column positions by looking for header row
      const columnPositions = findColumnPositions(items);

      if (!columnPositions) {
        errors.push(`Could not find column headers on page ${pageNum}`);
        continue;
      }

      // Parse transactions from this page
      const pageTransactions = extractTransactionsFromItems(items, columnPositions);

      for (const tx of pageTransactions) {
        const date = parseDateToISO(tx.date);
        if (!date) {
          errors.push(`Invalid date: ${tx.date}`);
          continue;
        }

        // We only care about the Débit column (expenses)
        // Crédit column is income/refunds which we ignore
        const amount = tx.debit || 0;
        const isCredit = !tx.debit && !!tx.credit; // true if only in credit column

        if (amount === 0 && !tx.credit) continue; // Skip if no amount at all

        const description = tx.description.join(' ').trim();
        const merchantName = extractMerchantName(description);

        transactions.push({
          date,
          description,
          amount: tx.debit || tx.credit || 0,
          currency: defaultCurrency,
          merchantName,
          isCredit, // true = income (to be filtered out), false = expense (to keep)
          originalLine: `${tx.date} ${description}`,
        });
      }
    }

    return { success: transactions.length > 0, transactions, errors };
  } catch (error) {
    errors.push(`PDF parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, transactions: [], errors };
  }
};

interface ColumnPositions {
  dateMin: number;
  dateMax: number;
  libelleMin: number;
  libelleMax: number;
  valeurMin: number;
  valeurMax: number;
  debitMin: number;
  debitMax: number;
  creditMin: number;
  creditMax: number;
}

function findColumnPositions(items: TextItem[]): ColumnPositions | null {
  // Look for "Débit" and "Crédit" headers to determine column positions
  const debitHeader = items.find(i => i.str.trim() === 'Débit');
  const creditHeader = items.find(i => i.str.trim() === 'Crédit');
  const valeurHeader = items.find(i => i.str.trim() === 'Valeur');
  const dateHeader = items.find(i => i.str.trim() === 'Date' || i.str.trim().startsWith('Date'));
  const libelleHeader = items.find(i => i.str.trim() === 'Libellé');

  if (!debitHeader || !creditHeader) {
    // Fallback: use approximate positions based on typical Bourso PDF layout
    // These are rough estimates that work for standard Bourso PDFs
    return {
      dateMin: 20,
      dateMax: 75,
      libelleMin: 75,
      libelleMax: 380,
      valeurMin: 380,
      valeurMax: 470,
      debitMin: 470,
      debitMax: 540,
      creditMin: 540,
      creditMax: 620,
    };
  }

  // Calculate column boundaries based on header positions
  const debitX = debitHeader.x;
  const creditX = creditHeader.x;
  const valeurX = valeurHeader?.x || debitX - 80;
  const libelleX = libelleHeader?.x || 75;
  const dateX = dateHeader?.x || 20;

  return {
    dateMin: dateX - 10,
    dateMax: libelleX - 5,
    libelleMin: libelleX - 5,
    libelleMax: valeurX - 5,
    valeurMin: valeurX - 5,
    valeurMax: debitX - 5,
    debitMin: debitX - 30,
    debitMax: creditX - 10,
    creditMin: creditX - 30,
    creditMax: creditX + 100,
  };
}

function extractTransactionsFromItems(items: TextItem[], cols: ColumnPositions): RawTransaction[] {
  const transactions: RawTransaction[] = [];

  // Sort items by Y position (top to bottom), then X (left to right)
  const sortedItems = [...items].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) < 5) return a.x - b.x;
    return yDiff;
  });

  // Group items by row (Y position within threshold)
  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [];
  let currentY = -1;

  for (const item of sortedItems) {
    if (currentY < 0 || Math.abs(item.y - currentY) < 8) {
      currentRow.push(item);
      if (currentY < 0) currentY = item.y;
    } else {
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [item];
      currentY = item.y;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  let currentTransaction: RawTransaction | null = null;
  let inTransactionSection = false;

  for (const row of rows) {
    const rowText = row.map(i => i.str).join(' ').trim();

    // Detect transaction section
    if (rowText.includes('MOUVEMENTS EN EUR')) {
      inTransactionSection = true;
      continue;
    }
    if (rowText.includes('Nouveau solde') || rowText.includes('A réception')) {
      inTransactionSection = false;
      continue;
    }
    if (!inTransactionSection) continue;

    // Skip header and irrelevant rows
    if (rowText.includes('Date') && rowText.includes('Libellé')) continue;
    if (rowText.includes('opération')) continue;
    if (rowText.includes('SOLDE AU')) continue;
    if (rowText.includes('Montant frais')) continue;

    // Check if this row starts with a date (DD/MM/YYYY) - new transaction
    const dateItem = row.find(i =>
      i.x >= cols.dateMin &&
      i.x <= cols.dateMax &&
      /^\d{2}\/\d{2}\/\d{4}$/.test(i.str.trim())
    );

    if (dateItem) {
      // Save previous transaction
      if (currentTransaction) {
        transactions.push(currentTransaction);
      }

      // Start new transaction
      currentTransaction = {
        date: dateItem.str.trim(),
        description: [],
        valueDate: '',
        debit: undefined,
        credit: undefined,
      };

      // Process items in this row by column
      for (const item of row) {
        const x = item.x;
        const str = item.str.trim();
        if (!str || item === dateItem) continue;

        // Libellé column
        if (x >= cols.libelleMin && x < cols.libelleMax) {
          currentTransaction.description.push(str);
        }
        // Valeur column (value date)
        else if (x >= cols.valeurMin && x < cols.valeurMax) {
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
            currentTransaction.valueDate = str;
          }
        }
        // Débit column (expenses - what we want!)
        else if (x >= cols.debitMin && x < cols.debitMax) {
          const amount = parseAmount(str);
          if (amount > 0) {
            currentTransaction.debit = amount;
          }
        }
        // Crédit column (income - to be filtered out)
        else if (x >= cols.creditMin && x <= cols.creditMax) {
          const amount = parseAmount(str);
          if (amount > 0) {
            currentTransaction.credit = amount;
          }
        }
      }
    } else if (currentTransaction) {
      // Continuation row - add to description or capture amounts
      for (const item of row) {
        const x = item.x;
        const str = item.str.trim();
        if (!str) continue;

        // Additional description lines
        if (x >= cols.libelleMin && x < cols.libelleMax) {
          currentTransaction.description.push(str);
        }
        // Débit amount on continuation row
        else if (x >= cols.debitMin && x < cols.debitMax && !currentTransaction.debit) {
          const amount = parseAmount(str);
          if (amount > 0) {
            currentTransaction.debit = amount;
          }
        }
        // Crédit amount on continuation row
        else if (x >= cols.creditMin && x <= cols.creditMax && !currentTransaction.credit) {
          const amount = parseAmount(str);
          if (amount > 0) {
            currentTransaction.credit = amount;
          }
        }
      }
    }
  }

  // Don't forget last transaction
  if (currentTransaction) {
    transactions.push(currentTransaction);
  }

  return transactions;
}

function parseAmount(str: string): number {
  if (!str) return 0;
  // Handle French number format: "1.234,56" or "1 234,56"
  const cleaned = str.replace(/[\s.]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDateToISO(dateStr: string): string {
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return '';
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function extractMerchantName(description: string): string {
  const upper = description.toUpperCase();

  // CARTE transactions: "CARTE DD/MM/YY MERCHANT CB*XXXX"
  if (upper.includes('CARTE')) {
    const carteMatch = description.match(/CARTE\s+\d{2}\/\d{2}\/\d{2}\s+(.+?)(?:\s+CB\*|\s*$)/i);
    if (carteMatch) {
      return carteMatch[1].trim();
    }
  }

  // PRLV SEPA: "PRLV SEPA MERCHANT"
  if (upper.includes('PRLV SEPA')) {
    const match = description.match(/PRLV SEPA\s+([^\s]+)/i);
    if (match) return match[1];
  }

  // VIR INST: "VIR INST NAME"
  if (upper.includes('VIR INST')) {
    const match = description.match(/VIR INST\s+(.+?)(?:\s+Virement|\s*$)/i);
    if (match) return match[1].trim();
  }

  // VIR: "VIR description"
  if (upper.startsWith('VIR ')) {
    const match = description.match(/VIR\s+(.+?)(?:\s+Virement|\s*$)/i);
    if (match) return match[1].trim();
  }

  // AVOIR: "AVOIR DD/MM/YY merchant"
  if (upper.includes('AVOIR')) {
    const match = description.match(/AVOIR\s+\d{2}\/\d{2}\/\d{2}\s+(.+?)(?:\s+CB\*|\s*$)/i);
    if (match) return match[1].trim();
  }

  // Default: first meaningful words
  const words = description.split(/\s+/).filter(w => w.length > 2);
  return words.slice(0, 3).join(' ');
}

export const boursoPdfParser = {
  provider: 'bourso' as const,
  canParse: (file: File) => file.type === 'application/pdf',
  parse: parseBoursoramaPdf,
};
