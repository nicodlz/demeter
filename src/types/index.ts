export type Currency = 'EUR' | 'USD';

export interface Client {
  id: string;
  name: string;
  email?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  siret?: string; // French business ID
  nif?: string; // Portuguese tax ID
  vatNumber?: string;
  deliveryAddress?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
  deliveryCountry?: string;
  additionalInfo?: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string; // 'day', 'month', 'hour', 'unit', 'package'
  unitPrice: number;
  vatRate: number;
  type: 'goods' | 'service' | 'mixed' | 'expense'; // Type of operation (required in France 2025)
}

export interface SavedItem {
  id: string;
  description: string;
  unit: string;
  unitPrice: number;
  type: 'goods' | 'service' | 'mixed' | 'expense';
  defaultQuantity: number;
  createdAt: string;
  usageCount: number;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface VATRate {
  country: string;
  countryCode: string;
  rates: number[];
  defaultRate: number;
}

export interface IssuerSettings {
  companyName: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone?: string;
  siret?: string; // French business ID
  nif?: string; // Portuguese tax ID (NIF)
  vatNumber?: string;
  legalForm?: string;
  capital?: string;
  rcs?: string;
  additionalLegalMentions?: string;
}

// Portugal AT status for Part B invoices
export interface PartBStatus {
  sent: boolean;
  sentAt?: string;
  atcud?: string; // Código Único de Documento
  seriesCode?: string; // Validation code for the series
  sequenceNumber?: number; // Sequential number within Part B series
  locked: boolean; // Cannot be modified after sending to AT
  error?: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  client: Client;
  lineItems: LineItem[];
  customFields: CustomField[];
  notes?: string;
  paymentTerms?: string;
  applyVAT: boolean;
  vatCountry: string;
  vatExemptionReason?: string; // Reason for VAT exemption (if applyVAT is false)
  splitEnabled?: boolean; // Enable split invoicing
  splitAmount?: number; // Amount for Part B (orange part)
  partB?: PartBStatus; // Portugal AT status for Part B
  currency: Currency;
  paid?: boolean; // Payment status
  paidAt?: string; // Date when marked as paid
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  issuer: IssuerSettings;
  invoiceCounter: number;
  invoiceNumberFormat: string;
  defaultPaymentTerms: string;
  vatRates: VATRate[];
  defaultCurrency: Currency;
  dashboardCurrency: Currency;
  privacyMode?: boolean; // Hide amounts on dashboard
  // Portugal Part B settings
  partBCounter?: number; // Separate counter for Part B sequence
  partBSeriesCode?: string; // AT validation code for Part B series
  partBSeriesPrefix?: string; // e.g., "FT-B" for Part B invoices
}

export interface InvoiceMetadata {
  version: string;
  invoice: Invoice;
  issuer: IssuerSettings;
}

// ============= Net Worth Types =============

export type AssetClass = 'stocks' | 'crypto' | 'cash' | 'stablecoins';

// V1: Simple flat structure (legacy)
export interface NetWorthSnapshot {
  id: string;
  date: string; // YYYY-MM-DD
  stocks: number;
  crypto: number;
  cash: number;
  stablecoins: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// V2: Subcategories with multi-currency support
export interface AssetEntry {
  id: string;
  name: string;        // ex: "ibkr", "btc", "binance"
  amount: number;
  currency: Currency;  // 'USD' | 'EUR'
}

export interface NetWorthSnapshotV2 {
  id: string;
  date: string; // YYYY-MM-DD
  version: 2;
  stocks: AssetEntry[];
  crypto: AssetEntry[];
  cash: AssetEntry[];
  stablecoins: AssetEntry[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Union type to support both formats
export type AnyNetWorthSnapshot = NetWorthSnapshot | NetWorthSnapshotV2;

// Type guard helper
export const isV2Snapshot = (snapshot: AnyNetWorthSnapshot): snapshot is NetWorthSnapshotV2 => {
  return 'version' in snapshot && snapshot.version === 2;
};

export interface AssetAllocation {
  assetClass: AssetClass;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export interface NetWorthEvolution {
  date: string;
  dateLabel: string;
  total: number;
  stocks: number;
  crypto: number;
  cash: number;
  stablecoins: number;
}

// ============= Expense Types =============

export type BankProvider = 'deblock' | 'bourso' | 'gnosis_pay' | 'etherfi' | 'manual';

export interface Expense {
  id: string;
  date: string;                    // YYYY-MM-DD
  description: string;
  amount: number;                  // Always positive (debits only)
  currency: Currency;
  category?: string;
  source: string;                  // Bank name (e.g., "Revolut Personal")
  sourceProvider: BankProvider;
  merchantName?: string;           // Normalized merchant name for auto-categorization
  cardLastFour?: string;
  originalLine?: string;           // Original line for debugging
  createdAt: string;
  updatedAt: string;
}

export interface CategoryMapping {
  id: string;
  normalizedMerchant: string;      // Normalized merchant (lowercase, no multiple spaces)
  category: string;
  createdAt: string;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  currency: Currency;
  merchantName?: string;
  cardLastFour?: string;
  isCredit: boolean;               // For filtering (we ignore credits)
  originalLine?: string;
}
