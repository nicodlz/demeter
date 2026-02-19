import type { ParsedTransaction, Currency, BankProvider } from '../../schemas';
import { deblockParser } from './deblockParser';
import { boursoParser } from './boursoParser';
import { gnosisPayParser } from './gnosisPayParser';
import { etherfiParser } from './etherfiParser';
import { parseBoursoramaPdf } from './boursoPdfParser';
import { parseCreditAgricolePdf } from './creditAgricolePdfParser';

export interface ParserResult {
  success: boolean;
  transactions: ParsedTransaction[];
  errors: string[];
}

interface BankParser {
  provider: BankProvider;
  canParse: (content: string) => boolean;
  parse: (content: string, defaultCurrency?: Currency) => ParserResult;
}

const parsers: BankParser[] = [
  gnosisPayParser,  // CSV - check first (most specific headers)
  etherfiParser,    // CSV - second
  deblockParser,    // Text - French dates
  boursoParser,     // Text - DD/MM/YYYY
];

/**
 * Parse a Bourso PDF file
 */
export const parseBoursoramaPdfFile = parseBoursoramaPdf;

/**
 * Parse a Crédit Agricole PDF file
 */
export const parseCreditAgricolePdfFile = parseCreditAgricolePdf;

/**
 * Parse a PDF file based on provider
 */
export const parsePdfFile = async (
  file: File,
  provider: BankProvider,
  defaultCurrency: Currency = 'EUR'
): Promise<ParserResult> => {
  switch (provider) {
    case 'bourso':
      return parseBoursoramaPdf(file, defaultCurrency);
    case 'credit_agricole':
      return parseCreditAgricolePdf(file, defaultCurrency);
    default:
      return { success: false, transactions: [], errors: [`No PDF parser for provider: ${provider}`] };
  }
};

/**
 * Auto-detect which parser to use based on content
 */
export const detectProvider = (content: string): BankProvider | null => {
  for (const parser of parsers) {
    if (parser.canParse(content)) {
      return parser.provider;
    }
  }
  return null;
};

/**
 * Parse content with a specific provider
 */
export const parseStatements = (
  content: string,
  provider: BankProvider,
  defaultCurrency: Currency = 'EUR'
): ParserResult => {
  const parser = parsers.find(p => p.provider === provider);
  if (!parser) {
    return {
      success: false,
      transactions: [],
      errors: [`Unknown provider: ${provider}`],
    };
  }
  return parser.parse(content, defaultCurrency);
};

/**
 * Parse a CSV file
 */
export const parseCSVFile = async (
  file: File,
  provider: BankProvider,
  defaultCurrency: Currency = 'EUR'
): Promise<ParserResult> => {
  const content = await file.text();
  return parseStatements(content, provider, defaultCurrency);
};

/**
 * Get display name for provider
 */
export const getProviderDisplayName = (provider: BankProvider): string => {
  const names: Record<BankProvider, string> = {
    deblock: 'Deblock',
    bourso: 'Boursorama',
    gnosis_pay: 'Gnosis Pay',
    etherfi: 'Etherfi',
    credit_agricole: 'Crédit Agricole',
    manual: 'Manual',
    invoice: 'Invoice',
  };
  return names[provider] || provider;
};

/**
 * Get input type for provider (text, csv, or pdf)
 */
export const getProviderInputType = (provider: BankProvider): 'text' | 'csv' | 'pdf' => {
  if (provider === 'gnosis_pay' || provider === 'etherfi') {
    return 'csv';
  }
  if (provider === 'bourso' || provider === 'credit_agricole') {
    return 'pdf';
  }
  return 'text';
};

export { deblockParser, boursoParser, gnosisPayParser, etherfiParser, parseBoursoramaPdf, parseCreditAgricolePdf };
