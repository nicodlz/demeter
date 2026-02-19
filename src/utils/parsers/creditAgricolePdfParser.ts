import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { TextItem as PdfTextItem } from 'pdfjs-dist/types/src/display/api';
import type { ParsedTransaction, Currency } from '../../types';
import { parseAmountStrict, frenchMonthToNumber } from './parserUtils';

// Set worker source for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

interface RawTransaction {
  dateOpe: string;      // DD.MM
  dateValeur: string;   // DD.MM
  description: string[];
  debit?: number;
  credit?: number;
}

/**
 * Parse a Crédit Agricole PDF bank statement
 *
 * PDF structure:
 * - Columns: Date opé. | Date valeur | Libellé des opérations | Débit | Crédit
 * - Dates are DD.MM (no year) - year inferred from statement period
 * - Statement period: "Ancien solde créditeur au DD.MM.YYYY" → "Nouveau solde créditeur au DD.MM.YYYY"
 * - Amounts: French format (comma decimal, space thousands: "1 264,00")
 * - Multi-line descriptions supported
 * - Special chars þ and ¨ from text extraction should be ignored
 */
export const parseCreditAgricolePdf = async (
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

    const allItems: TextItem[][] = [];

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

      allItems.push(items);
    }

    const detectedCurrency = detectCurrencyFromContent(allItems) || defaultCurrency;
    const { startDate, endDate } = findStatementPeriod(allItems);

    if (!startDate || !endDate) {
      errors.push('Could not determine statement period (Ancien solde / Nouveau solde dates)');
      return { success: false, transactions: [], errors };
    }

    let lastKnownColumns: ColumnPositions | null = null;

    for (let pageNum = 0; pageNum < allItems.length; pageNum++) {
      const items = allItems[pageNum];
      const foundColumns = findColumnPositions(items);
      const columnPositions: ColumnPositions | null = foundColumns || lastKnownColumns;

      if (!columnPositions) continue;
      if (foundColumns) lastKnownColumns = foundColumns;

      const pageTransactions = extractTransactionsFromItems(items, columnPositions);

      for (const tx of pageTransactions) {
        const date = resolveDate(tx.dateOpe, startDate, endDate);
        if (!date) {
          errors.push(`Invalid date: ${tx.dateOpe}`);
          continue;
        }

        const amount = tx.debit || tx.credit || 0;
        const isCredit = !tx.debit && !!tx.credit;
        if (amount === 0) continue;

        const description = tx.description.join(' ').trim();
        const merchantName = extractMerchantName(description);
        const cardLastFour = extractCardLastFour(description);

        transactions.push({
          date,
          description,
          amount,
          currency: detectedCurrency,
          merchantName,
          cardLastFour,
          isCredit,
          originalLine: `${tx.dateOpe} ${description}`,
        });
      }
    }

    return { success: transactions.length > 0, transactions, errors };
  } catch (error) {
    errors.push(`PDF parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, transactions: [], errors };
  }
};

function detectCurrencyFromContent(allPageItems: TextItem[][]): Currency | null {
  for (const items of allPageItems) {
    const fullText = items.map(i => i.str).join(' ').toUpperCase();
    if (fullText.includes('EN EUROS') || fullText.includes('EN EUR')) return 'EUR';
    if (fullText.includes('EN DOLLARS') || fullText.includes('EN USD')) return 'USD';
  }
  return null;
}

interface StatementPeriod {
  startDate: { day: number; month: number; year: number } | null;
  endDate: { day: number; month: number; year: number } | null;
}

function findStatementPeriod(allPageItems: TextItem[][]): StatementPeriod {
  let startDate: StatementPeriod['startDate'] = null;
  let endDate: StatementPeriod['endDate'] = null;

  for (const items of allPageItems) {
    const fullText = items.map(i => i.str).join(' ');

    const ancienMatch = fullText.match(/Ancien solde\s+(?:cr[ée]diteur|d[ée]biteur)\s+au\s+(\d{2})\.(\d{2})\.(\d{4})/i);
    if (ancienMatch && !startDate) {
      startDate = {
        day: parseInt(ancienMatch[1]),
        month: parseInt(ancienMatch[2]),
        year: parseInt(ancienMatch[3]),
      };
    }

    const nouveauMatch = fullText.match(/Nouveau solde\s+(?:cr[ée]diteur|d[ée]biteur)\s+au\s+(\d{2})\.(\d{2})\.(\d{4})/i);
    if (nouveauMatch && !endDate) {
      endDate = {
        day: parseInt(nouveauMatch[1]),
        month: parseInt(nouveauMatch[2]),
        year: parseInt(nouveauMatch[3]),
      };
    }

    if (!endDate) {
      const arreteMatch = fullText.match(/Date d'arr[ée]t[ée]\s*:\s*(\d{1,2})\s+(\w+)\s+(\d{4})/i);
      if (arreteMatch) {
        const monthNum = frenchMonthToNumber(arreteMatch[2]);
        if (monthNum) {
          endDate = {
            day: parseInt(arreteMatch[1]),
            month: monthNum,
            year: parseInt(arreteMatch[3]),
          };
        }
      }
    }
  }

  return { startDate, endDate };
}

/**
 * Resolve a DD.MM date to a full YYYY-MM-DD based on statement period.
 * Statement can span Dec→Jan, so December dates use start year,
 * January dates use end year.
 */
function resolveDate(
  dateStr: string,
  start: { day: number; month: number; year: number },
  end: { day: number; month: number; year: number }
): string {
  const match = dateStr.match(/(\d{2})\.(\d{2})/);
  if (!match) return '';

  const day = parseInt(match[1]);
  const month = parseInt(match[2]);
  const year = start.year === end.year ? start.year
    : (month >= start.month ? start.year : end.year);

  const mm = month.toString().padStart(2, '0');
  const dd = day.toString().padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

interface ColumnPositions {
  dateOpeMin: number;
  dateOpeMax: number;
  dateValeurMin: number;
  dateValeurMax: number;
  libelleMin: number;
  libelleMax: number;
  debitMin: number;
  debitMax: number;
  creditMin: number;
  creditMax: number;
}

function findColumnPositions(items: TextItem[]): ColumnPositions | null {
  const debitCandidates = items.filter(i => i.str.trim() === 'Débit' || i.str.trim() === 'Debit');
  const creditCandidates = items.filter(i => i.str.trim() === 'Crédit' || i.str.trim() === 'Credit');

  if (debitCandidates.length === 0 || creditCandidates.length === 0) return null;

  let debitHeader: TextItem | null = null;
  let creditHeader: TextItem | null = null;

  for (const dh of debitCandidates) {
    for (const ch of creditCandidates) {
      if (Math.abs(dh.y - ch.y) < 10 && ch.x > dh.x) {
        debitHeader = dh;
        creditHeader = ch;
        break;
      }
    }
    if (debitHeader) break;
  }

  if (!debitHeader || !creditHeader) return null;

  const dateOpeHeader = items.find(i =>
    Math.abs(i.y - debitHeader!.y) < 15 &&
    (i.str.trim() === 'Date opé.' || i.str.trim() === 'Date' || i.str.trim().startsWith('Date op'))
  );
  const libelleHeader = items.find(i =>
    Math.abs(i.y - debitHeader!.y) < 15 &&
    (i.str.trim().includes('Libellé') || i.str.trim().includes('opérations'))
  );

  const debitX = debitHeader.x;
  const debitRight = debitX + debitHeader.width;
  const creditX = creditHeader.x;
  const creditRight = creditX + creditHeader.width;
  const dateOpeX = dateOpeHeader?.x || 20;
  const libelleX = libelleHeader?.x || 120;

  return {
    dateOpeMin: dateOpeX - 10,
    dateOpeMax: dateOpeX + 50,
    dateValeurMin: dateOpeX + 30,
    dateValeurMax: libelleX - 5,
    libelleMin: libelleX - 10,
    libelleMax: debitX - 5,
    debitMin: debitX - 60,
    debitMax: debitRight + 10,
    creditMin: creditX - 60,
    creditMax: creditRight + 10,
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
    const cleanRowText = row.map(i => i.str).join(' ').replace(/[þ¨]/g, '').trim();

    if (cleanRowText.includes('Ancien solde')) { inTransactionSection = true; continue; }
    if (cleanRowText.includes('Nouveau solde') || cleanRowText.includes('Total des op')) {
      if (currentTransaction) { transactions.push(currentTransaction); currentTransaction = null; }
      inTransactionSection = false;
      continue;
    }
    if (cleanRowText.includes('(suite)')) { inTransactionSection = true; continue; }
    if (!inTransactionSection) continue;
    if (cleanRowText.includes('Date opé') || cleanRowText.includes('Date valeur') || cleanRowText.includes('Libellé des')) continue;
    if (cleanRowText.includes('Débit') && cleanRowText.includes('Crédit')) continue;

    const dateItem = row.find(i => {
      const str = i.str.replace(/[þ¨]/g, '').trim();
      return i.x >= cols.dateOpeMin && i.x <= cols.dateOpeMax && /^\d{2}\.\d{2}$/.test(str);
    });

    if (dateItem) {
      if (currentTransaction) transactions.push(currentTransaction);
      currentTransaction = {
        dateOpe: dateItem.str.replace(/[þ¨]/g, '').trim(),
        dateValeur: '',
        description: [],
      };
      processRowItems(row, dateItem, currentTransaction, cols, false);
      fixSplitAmounts(currentTransaction);
    } else if (currentTransaction) {
      processRowItems(row, null, currentTransaction, cols, true);
      fixSplitAmounts(currentTransaction);
    }
  }

  if (currentTransaction) transactions.push(currentTransaction);
  return transactions;
}

function processRowItems(
  row: TextItem[],
  dateItem: TextItem | null,
  tx: RawTransaction,
  cols: ColumnPositions,
  isContinuation: boolean
): void {
  for (const item of row) {
    const x = item.x;
    const str = item.str.replace(/[þ¨]/g, '').trim();
    if (!str || item === dateItem) continue;

    if (!isContinuation && x >= cols.dateValeurMin && x < cols.dateValeurMax && /^\d{2}\.\d{2}$/.test(str)) {
      tx.dateValeur = str;
      continue;
    }

    if (isContinuation && (/^Page \d+/.test(str) || /^\d+\/\d+$/.test(str))) continue;

    if (x >= cols.libelleMin && x < cols.debitMax) {
      if (x >= cols.debitMin) {
        const amount = parseAmountStrict(str);
        if (amount > 0 && (!isContinuation || !tx.debit)) { tx.debit = amount; continue; }
      }
      if (x >= cols.creditMin && x <= cols.creditMax) {
        const amount = parseAmountStrict(str);
        if (amount > 0 && (!isContinuation || !tx.credit)) { tx.credit = amount; continue; }
      }
      if (x < cols.libelleMax) tx.description.push(str);
    } else if (x >= cols.debitMin && x < cols.debitMax) {
      const amount = parseAmountStrict(str);
      if (amount > 0 && (!isContinuation || !tx.debit)) tx.debit = amount;
    } else if (x >= cols.creditMin && x <= cols.creditMax) {
      const amount = parseAmountStrict(str);
      if (amount > 0 && (!isContinuation || !tx.credit)) tx.credit = amount;
    }
  }
}

/**
 * Fix amounts split across text items due to thousands separator.
 * Example: "1 000,00" → "1" near debit column + "000,00" in debit column.
 */
function fixSplitAmounts(tx: RawTransaction): void {
  if (tx.description.length === 0) return;
  const lastDesc = tx.description[tx.description.length - 1];
  if (!/^\d{1,3}$/.test(lastDesc)) return;
  const prefix = parseInt(lastDesc);
  if (prefix <= 0) return;

  if (tx.debit !== undefined && tx.debit === 0) { tx.debit = prefix * 1000; tx.description.pop(); return; }
  if (tx.credit !== undefined && tx.credit === 0) { tx.credit = prefix * 1000; tx.description.pop(); }
}

function extractCardLastFour(description: string): string | undefined {
  const match = description.match(/Carte\s+X(\d{4})/i);
  return match ? match[1] : undefined;
}

function extractMerchantName(description: string): string {
  const upper = description.toUpperCase();

  if (upper.includes('CARTE X')) {
    const m = description.match(/Carte\s+X\d{4}\s+(.+?)(?:\s+\d{2}\/\d{2})/i);
    if (m) return m[1].trim();
    const fb = description.match(/Carte\s+X\d{4}\s+(.+)/i);
    if (fb) return fb[1].trim();
  }
  if (upper.startsWith('PRLV')) {
    const m = description.match(/Prlv\s+(.+?)(?:\s{2,}|$)/i);
    if (m) return m[1].trim();
  }
  if (upper.includes('VIREMENT DE')) {
    const m = description.match(/Virement\s+De\s+(.+?)(?:\s{2,}|$)/i);
    if (m) return m[1].trim();
  }
  if (upper.includes('VIREMENT WEB')) {
    const m = description.match(/Virement\s+Web\s+(.+?)(?:\s{2,}|$)/i);
    if (m) return m[1].trim();
  }
  if (upper.includes('VIREMENT')) {
    const m = description.match(/Virement\s+(.+?)(?:\s{2,}|$)/i);
    if (m) return m[1].trim();
  }
  if (upper.includes('RET DAB')) {
    const m = description.match(/Ret\s+DAB\s+X\d{4}\s+(.+?)(?:\s+\d{2}\/\d{2})/i);
    if (m) return m[1].trim();
    const fb = description.match(/Ret\s+DAB\s+X\d{4}\s+(.+)/i);
    if (fb) return fb[1].trim();
  }
  if (upper.includes('REM CHQ')) return 'Remise Chèque';

  const words = description.split(/\s+/).filter(w => w.length > 2);
  return words.slice(0, 3).join(' ');
}

export const creditAgricolePdfParser = {
  provider: 'credit_agricole' as const,
  canParse: (file: File) => file.type === 'application/pdf',
  parse: parseCreditAgricolePdf,
};
