import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { TextItem as PdfTextItem } from 'pdfjs-dist/types/src/display/api';
import type { ParsedTransaction, Currency } from '@/schemas';

// Set worker source for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

interface RawTransaction {
  dateMov: string;    // DD/MM
  dateVal: string;    // DD/MM
  description: string[];
  amount: number;     // signed: negative = debit, positive = credit
}

/**
 * Parse a BPI (Banco BPI) PDF bank statement ("Extracto Integrado")
 *
 * PDF structure:
 * - Page 1: Summary (ACTIVOS, Depósitos à Ordem) — skip
 * - Page 2+: Transaction table under "DEPÓSITOS À ORDEM"
 * - Columns: DATA MOV | DATA VAL | DESCRIÇÃO DO MOVIMENTO | MOEDA | VALOR | SALDO
 * - Dates: DD/MM format
 * - Amounts: signed values (negative = debit with leading "-", positive = credit)
 * - Statement period: "Período De DD/MM/YYYY a DD/MM/YYYY"
 * - Currency: EUR (from MOEDA column or IBAN)
 * - Multi-line descriptions: continuation rows without dates
 * - Special rows: SALDO ANTERIOR CONTABILISTICO, SALDO ACTUAL CONTABILISTICO, SALDO ACTUAL DISPONIVEL
 */
export const parseBpiPdf = async (
  file: File,
  _defaultCurrency: Currency = 'EUR' // BPI statements are always EUR
): Promise<{
  success: boolean;
  transactions: ParsedTransaction[];
  errors: string[];
}> => {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    // BPI statements are often encrypted (owner password only, empty user password).
    // Try without password first, then with empty password if it fails.
    let pdf;
    try {
      pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    } catch {
      pdf = await pdfjsLib.getDocument({ data: arrayBuffer, password: '' }).promise;
    }

    // Extract all text items from all pages
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
          y: viewport.height - item.transform[5],
          width: item.width,
        }));

      allItems.push(items);
    }

    // Find statement period
    const { startDate, endDate } = findStatementPeriod(allItems);

    if (!startDate || !endDate) {
      errors.push('Could not determine statement period (Período De ... a ...)');
      return { success: false, transactions: [], errors };
    }

    // Process each page
    for (const items of allItems) {
      const cols = findColumnPositions(items);
      if (!cols) continue;

      const pageTxs = extractTransactionsFromItems(items, cols);

      for (const tx of pageTxs) {
        const date = resolveDate(tx.dateMov, startDate, endDate);
        if (!date) {
          errors.push(`Invalid date: ${tx.dateMov}`);
          continue;
        }

        if (tx.amount === 0) continue;

        const isCredit = tx.amount > 0;
        const amount = Math.abs(tx.amount);
        const description = tx.description.join(' ').trim();
        const merchantName = extractMerchantName(description);

        transactions.push({
          date,
          description,
          amount,
          currency: 'EUR' as Currency,
          merchantName,
          isCredit,
          originalLine: `${tx.dateMov} ${description}`,
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

    // "Período De DD/MM/YYYY a DD/MM/YYYY" or just "De DD/MM/YYYY a DD/MM/YYYY"
    // (pdfjs-dist may separate "Período" and "De" into distant text items)
    const match = fullText.match(/(?:Per[ií]odo\s+)?De\s+(\d{2})\/(\d{2})\/(\d{4})\s+a\s+(\d{2})\/(\d{2})\/(\d{4})/i);
    if (match) {
      startDate = { day: parseInt(match[1]), month: parseInt(match[2]), year: parseInt(match[3]) };
      endDate = { day: parseInt(match[4]), month: parseInt(match[5]), year: parseInt(match[6]) };
      break;
    }

    // Fallback: "Extracto MM/YYYY"
    const extractoMatch = fullText.match(/Extracto\s+(\d{2})\/(\d{4})/i);
    if (extractoMatch && !endDate) {
      const month = parseInt(extractoMatch[1]);
      const year = parseInt(extractoMatch[2]);
      // Approximate: statement covers one month
      endDate = { day: 28, month, year };
      startDate = { day: 1, month: month === 1 ? 12 : month - 1, year: month === 1 ? year - 1 : year };
    }
  }

  return { startDate, endDate };
}

/**
 * Resolve DD/MM date to YYYY-MM-DD based on statement period.
 */
function resolveDate(
  dateStr: string,
  start: { day: number; month: number; year: number },
  end: { day: number; month: number; year: number }
): string {
  const match = dateStr.match(/(\d{2})\/(\d{2})/);
  if (!match) return '';

  const day = parseInt(match[1]);
  const month = parseInt(match[2]);

  let year: number;
  if (start.year === end.year) {
    year = start.year;
  } else {
    // Cross-year: months >= start month → start year, else end year
    year = month >= start.month ? start.year : end.year;
  }

  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

interface ColumnPositions {
  dataMovMin: number;
  dataMovMax: number;
  dataValMin: number;
  dataValMax: number;
  descMin: number;
  descMax: number;
  valorMin: number;
  valorMax: number;
  saldoMin: number;
  saldoMax: number;
}

function findColumnPositions(items: TextItem[]): ColumnPositions | null {
  // Look for header: "DATA" and "VALOR" and "SALDO" on the same row
  // BPI header: DATA MOV | DATA VAL | DESCRIÇÃO DO MOVIMENTO | MOEDA | VALOR | SALDO
  const dataItems = items.filter(i => i.str.trim() === 'DATA');
  const valorItems = items.filter(i => i.str.trim() === 'VALOR');
  const saldoItems = items.filter(i => i.str.trim() === 'SALDO');

  if (dataItems.length === 0 || valorItems.length === 0 || saldoItems.length === 0) return null;

  // Find header row: DATA and VALOR on same Y
  let headerY = -1;
  let dataItem: TextItem | null = null;
  let valorItem: TextItem | null = null;
  let saldoItem: TextItem | null = null;

  for (const d of dataItems) {
    for (const v of valorItems) {
      if (Math.abs(d.y - v.y) < 10) {
        const s = saldoItems.find(si => Math.abs(si.y - d.y) < 10);
        if (s) {
          headerY = d.y;
          dataItem = d;
          valorItem = v;
          saldoItem = s;
          break;
        }
      }
    }
    if (headerY >= 0) break;
  }

  if (!dataItem || !valorItem || !saldoItem) return null;

  // Look for sub-headers: MOV | VAL on next row
  const movItems = items.filter(i => i.str.trim() === 'MOV' && Math.abs(i.y - headerY) < 25 && i.y > headerY);
  const valItems = items.filter(i => i.str.trim() === 'VAL' && Math.abs(i.y - headerY) < 25 && i.y > headerY);

  const dataMovX = movItems.length > 0 ? Math.min(dataItem.x, movItems[0].x) : dataItem.x;
  const dataValX = valItems.length > 0 ? valItems[0].x : dataItem.x + 40;

  // DESCRIÇÃO is between the date columns and VALOR
  const descItem = items.find(i =>
    Math.abs(i.y - headerY) < 10 &&
    (i.str.trim().startsWith('DESCRI') || i.str.trim().includes('MOVIMENTO'))
  );
  const descX = descItem?.x || dataValX + 40;

  const valorX = valorItem.x;
  const valorRight = valorX + valorItem.width;
  const saldoX = saldoItem.x;
  const saldoRight = saldoX + saldoItem.width;

  return {
    dataMovMin: dataMovX - 10,
    dataMovMax: dataMovX + 40,
    dataValMin: dataValX - 10,
    dataValMax: descX - 5,
    descMin: descX - 10,
    descMax: valorX - 20,
    valorMin: valorX - 80,
    valorMax: valorRight + 15,
    saldoMin: saldoX - 80,
    saldoMax: saldoRight + 15,
  };
}

function extractTransactionsFromItems(items: TextItem[], cols: ColumnPositions): RawTransaction[] {
  const transactions: RawTransaction[] = [];

  // Sort by Y then X
  const sorted = [...items].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) < 5) return a.x - b.x;
    return yDiff;
  });

  // Group into rows
  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [];
  let currentY = -1;

  for (const item of sorted) {
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

  let currentTx: RawTransaction | null = null;
  let inSection = false;

  for (const row of rows) {
    const rowText = row.map(i => i.str).join(' ').trim();

    // Start after SALDO ANTERIOR
    if (rowText.includes('SALDO ANTERIOR')) {
      inSection = true;
      continue;
    }

    // End at SALDO ACTUAL
    if (rowText.includes('SALDO ACTUAL') || rowText.includes('TOTAL DEP')) {
      if (currentTx) {
        transactions.push(currentTx);
        currentTx = null;
      }
      inSection = false;
      continue;
    }

    if (!inSection) continue;

    // Skip header rows and metadata
    if (rowText.includes('DATA') && rowText.includes('DESCRI')) continue;
    if (rowText.includes('MOV') && rowText.includes('VAL')) continue;
    if (rowText.startsWith('CONTA') || rowText.startsWith('NIB') || rowText.startsWith('IBAN')) continue;
    if (rowText.includes('EUR') && row.length <= 2) continue;

    // Check for date in DATA MOV column → new transaction
    const dateItem = row.find(i => {
      const str = i.str.trim();
      return i.x >= cols.dataMovMin &&
        i.x <= cols.dataMovMax &&
        /^\d{2}\/\d{2}$/.test(str);
    });

    if (dateItem) {
      if (currentTx) transactions.push(currentTx);

      currentTx = {
        dateMov: dateItem.str.trim(),
        dateVal: '',
        description: [],
        amount: 0,
      };

      // Process row items
      for (const item of row) {
        if (item === dateItem) continue;
        const str = item.str.trim();
        if (!str) continue;
        const x = item.x;

        // Date valeur
        if (x >= cols.dataValMin && x <= cols.dataValMax && /^\d{2}\/\d{2}$/.test(str)) {
          currentTx.dateVal = str;
          continue;
        }

        // VALOR column (signed amount)
        if (x >= cols.valorMin && x <= cols.valorMax) {
          const amount = parseAmount(str);
          if (amount !== null) {
            currentTx.amount = amount;
            continue;
          }
        }

        // SALDO column — skip
        if (x >= cols.saldoMin && x <= cols.saldoMax) {
          const amount = parseAmount(str);
          if (amount !== null) continue;
        }

        // Description
        if (x >= cols.descMin && x <= cols.descMax) {
          currentTx.description.push(str);
        }
      }
    } else if (currentTx) {
      // Row without DATA MOV: could be a continuation OR a new transaction without DATA MOV.
      // Pre-scan: if row has a VALOR amount, it's a new transaction (inheriting DATA MOV from previous).
      const rowHasAmount = row.some(item => {
        const x = item.x;
        return x >= cols.valorMin && x <= cols.valorMax && parseAmount(item.str.trim()) !== null;
      });

      if (rowHasAmount && currentTx.amount !== 0) {
        // This is a NEW transaction without its own DATA MOV date
        transactions.push(currentTx);
        const prevDateMov: string = currentTx.dateMov;
        currentTx = {
          dateMov: prevDateMov, // inherit from previous transaction
          dateVal: '',
          description: [],
          amount: 0,
        };
      }

      for (const item of row) {
        const str = item.str.trim();
        if (!str) continue;
        const x = item.x;

        // Date valeur on continuation row
        if (x >= cols.dataValMin && x <= cols.dataValMax && /^\d{2}\/\d{2}$/.test(str)) {
          currentTx.dateVal = str;
          continue;
        }

        // VALOR
        if (x >= cols.valorMin && x <= cols.valorMax) {
          const amount = parseAmount(str);
          if (amount !== null) {
            currentTx.amount = amount;
            continue;
          }
        }

        // SALDO — skip
        if (x >= cols.saldoMin && x <= cols.saldoMax) {
          const amount = parseAmount(str);
          if (amount !== null) continue;
        }

        // Description continuation
        if (x >= cols.descMin && x <= cols.descMax) {
          currentTx.description.push(str);
        }
      }
    }
  }

  if (currentTx) transactions.push(currentTx);

  return transactions;
}

/**
 * Parse BPI amount format.
 * BPI uses: "-95,28" for debits, "29,06" or "58,52" for credits.
 * Returns signed number or null if not a valid amount.
 */
function parseAmount(str: string): number | null {
  if (!str) return null;
  // Must contain comma (decimal separator) and no letters (reject "UNIPESSOAL,LDA" etc.)
  if (!str.includes(',')) return null;
  if (/[a-zA-Z]/.test(str)) return null;
  // Clean: remove spaces and thousand separators (.), replace decimal comma
  const cleaned = str.replace(/[\s\u00a0.]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function extractMerchantName(description: string): string {
  const upper = description.toUpperCase();

  // TRF CR/SEPA+ INST/CR SEPA+ NNNNNNN DE <MERCHANT>
  if (upper.includes('TRF') && upper.includes('SEPA') && upper.includes(' DE ')) {
    const match = description.match(/\bDE\s+(.+)/i);
    if (match) return match[1].trim();
  }

  // TRF DB SEPA+ ... PARA <MERCHANT>
  if (upper.includes('TRF') && upper.includes('SEPA') && upper.includes(' PARA ')) {
    const match = description.match(/PARA\s+(.+)/i);
    if (match) return match[1].trim();
  }

  // DD (direct debit): DD <COMPANY> <REF>
  if (upper.startsWith('DD ')) {
    const match = description.match(/^DD\s+(.+?)(?:\s+\d{5,})/i);
    if (match) return match[1].trim();
    return description.substring(3).trim();
  }

  // PAG. PORTAGEM/TELEF. PUBL. ELEC
  if (upper.includes('PAG. PORTAGEM') || upper.includes('PAG.PORTAGEM')) {
    return 'Portagem';
  }

  // PAG. SERV. ATM REF. (service payments via ATM)
  if (upper.includes('PAG. SERV. ATM') || upper.includes('PAG.SERV.ATM')) {
    return 'Pagamento Serviços ATM';
  }

  // MANUTENCAO DE CONTA
  if (upper.includes('MANUTENCAO DE CONTA')) {
    return 'BPI - Manutenção conta';
  }

  // IMPOSTO DE SELO
  if (upper.includes('IMPOSTO DE SELO')) {
    return 'Imposto de Selo';
  }

  // MB WAY
  if (upper.includes('MB WAY')) {
    const match = description.match(/MB WAY\s+(.+)/i);
    if (match) return match[1].trim();
    return 'MB WAY';
  }

  // MULTIBANCO
  if (upper.includes('MULTIBANCO') || upper.includes('MB ')) {
    return description.trim();
  }

  // Default: first meaningful words
  const words = description.split(/\s+/).filter(w => w.length > 2);
  return words.slice(0, 4).join(' ');
}

export const bpiPdfParser = {
  provider: 'bpi' as const,
  canParse: (file: File) => file.type === 'application/pdf',
  parse: parseBpiPdf,
};
