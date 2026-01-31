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

    // First pass: extract all text items from all pages to find statement period
    const allItems: TextItem[][] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

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

      allItems.push(items);
    }

    // Find statement period (year info)
    const { startDate, endDate } = findStatementPeriod(allItems);

    if (!startDate || !endDate) {
      errors.push('Could not determine statement period (Ancien solde / Nouveau solde dates)');
      return { success: false, transactions: [], errors };
    }

    // Process each page
    for (let pageNum = 0; pageNum < allItems.length; pageNum++) {
      const items = allItems[pageNum];

      // Find column positions by looking for header row
      const columnPositions = findColumnPositions(items);

      if (!columnPositions) {
        // Not every page has headers (e.g. continuation pages with "(suite)")
        // Try to use fallback positions
        continue;
      }

      // Parse transactions from this page
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
          currency: defaultCurrency,
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

interface StatementPeriod {
  startDate: { day: number; month: number; year: number } | null;
  endDate: { day: number; month: number; year: number } | null;
}

function findStatementPeriod(allPageItems: TextItem[][]): StatementPeriod {
  let startDate: StatementPeriod['startDate'] = null;
  let endDate: StatementPeriod['endDate'] = null;

  for (const items of allPageItems) {
    const fullText = items.map(i => i.str).join(' ');

    // Look for "Ancien solde créditeur au DD.MM.YYYY" or "Ancien solde débiteur au DD.MM.YYYY"
    const ancienMatch = fullText.match(/Ancien solde\s+(?:cr[ée]diteur|d[ée]biteur)\s+au\s+(\d{2})\.(\d{2})\.(\d{4})/i);
    if (ancienMatch && !startDate) {
      startDate = {
        day: parseInt(ancienMatch[1]),
        month: parseInt(ancienMatch[2]),
        year: parseInt(ancienMatch[3]),
      };
    }

    // Look for "Nouveau solde créditeur au DD.MM.YYYY" or "Nouveau solde débiteur au DD.MM.YYYY"
    const nouveauMatch = fullText.match(/Nouveau solde\s+(?:cr[ée]diteur|d[ée]biteur)\s+au\s+(\d{2})\.(\d{2})\.(\d{4})/i);
    if (nouveauMatch && !endDate) {
      endDate = {
        day: parseInt(nouveauMatch[1]),
        month: parseInt(nouveauMatch[2]),
        year: parseInt(nouveauMatch[3]),
      };
    }

    // Fallback: "Date d'arrêté : DD Mois YYYY"
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

function frenchMonthToNumber(month: string): number | null {
  const months: Record<string, number> = {
    'janvier': 1, 'février': 2, 'fevrier': 2, 'mars': 3, 'avril': 4,
    'mai': 5, 'juin': 6, 'juillet': 7, 'août': 8, 'aout': 8,
    'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12, 'decembre': 12,
  };
  return months[month.toLowerCase()] || null;
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

  let year: number;

  if (start.year === end.year) {
    // Same year statement
    year = start.year;
  } else {
    // Cross-year statement (e.g., Dec 2025 → Jan 2026)
    // Months >= start month belong to start year
    // Months <= end month belong to end year
    if (month >= start.month) {
      year = start.year;
    } else {
      year = end.year;
    }
  }

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
  // Look for column headers
  const debitHeader = items.find(i => i.str.trim() === 'Débit' || i.str.trim() === 'Debit');
  const creditHeader = items.find(i => i.str.trim() === 'Crédit' || i.str.trim() === 'Credit');
  const dateOpeHeader = items.find(i =>
    i.str.trim() === 'Date opé.' || i.str.trim() === 'Date' || i.str.trim().startsWith('Date op')
  );
  const libelleHeader = items.find(i =>
    i.str.trim().includes('Libellé') || i.str.trim().includes('opérations')
  );

  if (!debitHeader || !creditHeader) {
    return null;
  }

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

    // Clean special characters
    const cleanRowText = rowText.replace(/[þ¨]/g, '').trim();

    // Detect start of transaction section: "Ancien solde"
    if (cleanRowText.includes('Ancien solde')) {
      inTransactionSection = true;
      continue;
    }

    // Detect end of transaction section
    if (cleanRowText.includes('Nouveau solde') || cleanRowText.includes('Total des opérations') || cleanRowText.includes('Total des op')) {
      if (currentTransaction) {
        transactions.push(currentTransaction);
        currentTransaction = null;
      }
      inTransactionSection = false;
      continue;
    }

    // Handle continuation pages with "(suite)"
    if (cleanRowText.includes('(suite)')) {
      inTransactionSection = true;
      continue;
    }

    if (!inTransactionSection) continue;

    // Skip header rows
    if (cleanRowText.includes('Date opé') || cleanRowText.includes('Date valeur') || cleanRowText.includes('Libellé des')) continue;
    if (cleanRowText.includes('Débit') && cleanRowText.includes('Crédit')) continue;

    // Check if this row starts with a date (DD.MM) - new transaction
    // Look for date items in the date column area
    const dateItem = row.find(i => {
      const str = i.str.replace(/[þ¨]/g, '').trim();
      return i.x >= cols.dateOpeMin &&
        i.x <= cols.dateOpeMax &&
        /^\d{2}\.\d{2}$/.test(str);
    });

    if (dateItem) {
      // Save previous transaction
      if (currentTransaction) {
        transactions.push(currentTransaction);
      }

      const dateOpe = dateItem.str.replace(/[þ¨]/g, '').trim();

      // Start new transaction
      currentTransaction = {
        dateOpe,
        dateValeur: '',
        description: [],
        debit: undefined,
        credit: undefined,
      };

      // Process items in this row by column
      for (const item of row) {
        const x = item.x;
        const str = item.str.replace(/[þ¨]/g, '').trim();
        if (!str || item === dateItem) continue;

        // Second date (Date valeur)
        if (x >= cols.dateValeurMin && x < cols.dateValeurMax && /^\d{2}\.\d{2}$/.test(str)) {
          currentTransaction.dateValeur = str;
        }
        // Libellé column
        else if (x >= cols.libelleMin && x < cols.libelleMax) {
          currentTransaction.description.push(str);
        }
        // Débit column (expenses)
        else if (x >= cols.debitMin && x < cols.debitMax) {
          const amount = parseAmount(str);
          if (amount > 0) {
            currentTransaction.debit = amount;
          }
        }
        // Crédit column (income)
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
        const str = item.str.replace(/[þ¨]/g, '').trim();
        if (!str) continue;

        // Skip if it looks like a page number or header
        if (/^Page \d+/.test(str) || /^\d+\/\d+$/.test(str)) continue;

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
  // Handle French number format: "1 264,00" or "590,00" or "3,86"
  const cleaned = str.replace(/[\s\u00a0]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function extractCardLastFour(description: string): string | undefined {
  // "Carte X5656" pattern
  const match = description.match(/Carte\s+X(\d{4})/i);
  return match ? match[1] : undefined;
}

function extractMerchantName(description: string): string {
  const upper = description.toUpperCase();

  // Carte transactions: "Carte X5656 MERCHANT DD/MM"
  if (upper.includes('CARTE X')) {
    const match = description.match(/Carte\s+X\d{4}\s+(.+?)(?:\s+\d{2}\/\d{2})/i);
    if (match) return match[1].trim();
    // Fallback if no date at end
    const fallback = description.match(/Carte\s+X\d{4}\s+(.+)/i);
    if (fallback) return fallback[1].trim();
  }

  // Prélèvement: "Prlv DESCRIPTION"
  if (upper.startsWith('PRLV')) {
    const match = description.match(/Prlv\s+(.+?)(?:\s{2,}|$)/i);
    if (match) return match[1].trim();
  }

  // Virement De: "Virement De NAME"
  if (upper.includes('VIREMENT DE')) {
    const match = description.match(/Virement\s+De\s+(.+?)(?:\s{2,}|$)/i);
    if (match) return match[1].trim();
  }

  // Virement Web: "Virement Web NAME DESCRIPTION"
  if (upper.includes('VIREMENT WEB')) {
    const match = description.match(/Virement\s+Web\s+(.+?)(?:\s{2,}|$)/i);
    if (match) return match[1].trim();
  }

  // Virement: "Virement NAME"
  if (upper.includes('VIREMENT')) {
    const match = description.match(/Virement\s+(.+?)(?:\s{2,}|$)/i);
    if (match) return match[1].trim();
  }

  // Ret DAB: "Ret DAB X5656 LOCATION DD/MM"
  if (upper.includes('RET DAB')) {
    const match = description.match(/Ret\s+DAB\s+X\d{4}\s+(.+?)(?:\s+\d{2}\/\d{2})/i);
    if (match) return match[1].trim();
    const fallback = description.match(/Ret\s+DAB\s+X\d{4}\s+(.+)/i);
    if (fallback) return fallback[1].trim();
  }

  // Rem Chq: "Rem Chq NUMBER"
  if (upper.includes('REM CHQ')) {
    return 'Remise Chèque';
  }

  // Default: first meaningful words
  const words = description.split(/\s+/).filter(w => w.length > 2);
  return words.slice(0, 3).join(' ');
}

export const creditAgricolePdfParser = {
  provider: 'credit_agricole' as const,
  canParse: (file: File) => file.type === 'application/pdf',
  parse: parseCreditAgricolePdf,
};
