import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { TextItem as PdfTextItem } from 'pdfjs-dist/types/src/display/api';
import type { ParsedTransaction, Currency } from '../../types';
import { parseAmount, parseDateDDMMYYYY, createTransaction } from './parserUtils';

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
 * - Débit = money OUT (expenses)
 * - Crédit = money IN (income/refunds)
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

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const items: TextItem[] = textContent.items
        .filter((item): item is PdfTextItem => 'str' in item && 'transform' in item)
        .map((item) => ({
          str: item.str,
          x: item.transform[4],
          y: viewport.height - item.transform[5],
          width: item.width,
        }));

      const columnPositions = findColumnPositions(items);
      if (!columnPositions) {
        errors.push(`Could not find column headers on page ${pageNum}`);
        continue;
      }

      const pageTransactions = extractTransactionsFromItems(items, columnPositions);

      for (const tx of pageTransactions) {
        const date = parseDateDDMMYYYY(tx.date);
        if (!date) {
          errors.push(`Invalid date: ${tx.date}`);
          continue;
        }

        const isCredit = !tx.debit && !!tx.credit;
        if (!tx.debit && !tx.credit) continue;

        const description = tx.description.join(' ').trim();
        const merchantName = extractMerchantName(description);

        const parsedTx = createTransaction(
          {
            date,
            description,
            amount: tx.debit || tx.credit || 0,
            currency: defaultCurrency,
            merchantName,
            isCredit,
            originalLine: `${tx.date} ${description}`,
          },
          errors
        );
        if (parsedTx) transactions.push(parsedTx);
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
  const debitHeader = items.find(i => i.str.trim() === 'Débit');
  const creditHeader = items.find(i => i.str.trim() === 'Crédit');
  const valeurHeader = items.find(i => i.str.trim() === 'Valeur');
  const dateHeader = items.find(i => i.str.trim() === 'Date' || i.str.trim().startsWith('Date'));
  const libelleHeader = items.find(i => i.str.trim() === 'Libellé');

  if (!debitHeader || !creditHeader) {
    return {
      dateMin: 20, dateMax: 75,
      libelleMin: 75, libelleMax: 380,
      valeurMin: 380, valeurMax: 470,
      debitMin: 470, debitMax: 540,
      creditMin: 540, creditMax: 620,
    };
  }

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

  const sortedItems = [...items].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) < 5) return a.x - b.x;
    return yDiff;
  });

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

    if (rowText.includes('MOUVEMENTS EN EUR')) { inTransactionSection = true; continue; }
    if (rowText.includes('Nouveau solde') || rowText.includes('A réception')) { inTransactionSection = false; continue; }
    if (!inTransactionSection) continue;
    if (rowText.includes('Date') && rowText.includes('Libellé')) continue;
    if (rowText.includes('opération')) continue;
    if (rowText.includes('SOLDE AU') || rowText.includes('Montant frais')) continue;

    const dateItem = row.find(i =>
      i.x >= cols.dateMin && i.x <= cols.dateMax &&
      /^\d{2}\/\d{2}\/\d{4}$/.test(i.str.trim())
    );

    if (dateItem) {
      if (currentTransaction) transactions.push(currentTransaction);
      currentTransaction = { date: dateItem.str.trim(), description: [], valueDate: '' };

      for (const item of row) {
        const x = item.x;
        const str = item.str.trim();
        if (!str || item === dateItem) continue;

        if (x >= cols.libelleMin && x < cols.libelleMax) {
          currentTransaction.description.push(str);
        } else if (x >= cols.valeurMin && x < cols.valeurMax && /^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
          currentTransaction.valueDate = str;
        } else if (x >= cols.debitMin && x < cols.debitMax) {
          const amount = parseAmount(str);
          if (amount > 0) currentTransaction.debit = amount;
        } else if (x >= cols.creditMin && x <= cols.creditMax) {
          const amount = parseAmount(str);
          if (amount > 0) currentTransaction.credit = amount;
        }
      }
    } else if (currentTransaction) {
      for (const item of row) {
        const x = item.x;
        const str = item.str.trim();
        if (!str) continue;

        if (x >= cols.libelleMin && x < cols.libelleMax) {
          currentTransaction.description.push(str);
        } else if (x >= cols.debitMin && x < cols.debitMax && !currentTransaction.debit) {
          const amount = parseAmount(str);
          if (amount > 0) currentTransaction.debit = amount;
        } else if (x >= cols.creditMin && x <= cols.creditMax && !currentTransaction.credit) {
          const amount = parseAmount(str);
          if (amount > 0) currentTransaction.credit = amount;
        }
      }
    }
  }

  if (currentTransaction) transactions.push(currentTransaction);
  return transactions;
}

function extractMerchantName(description: string): string {
  const upper = description.toUpperCase();

  if (upper.includes('CARTE')) {
    const m = description.match(/CARTE\s+\d{2}\/\d{2}\/\d{2}\s+(.+?)(?:\s+CB\*|\s*$)/i);
    if (m) return m[1].trim();
  }
  if (upper.includes('PRLV SEPA')) {
    const m = description.match(/PRLV SEPA\s+([^\s]+)/i);
    if (m) return m[1];
  }
  if (upper.includes('VIR INST')) {
    const m = description.match(/VIR INST\s+(.+?)(?:\s+Virement|\s*$)/i);
    if (m) return m[1].trim();
  }
  if (upper.startsWith('VIR ')) {
    const m = description.match(/VIR\s+(.+?)(?:\s+Virement|\s*$)/i);
    if (m) return m[1].trim();
  }
  if (upper.includes('AVOIR')) {
    const m = description.match(/AVOIR\s+\d{2}\/\d{2}\/\d{2}\s+(.+?)(?:\s+CB\*|\s*$)/i);
    if (m) return m[1].trim();
  }

  const words = description.split(/\s+/).filter(w => w.length > 2);
  return words.slice(0, 3).join(' ');
}

export const boursoPdfParser = {
  provider: 'bourso' as const,
  canParse: (file: File) => file.type === 'application/pdf',
  parse: parseBoursoramaPdf,
};
