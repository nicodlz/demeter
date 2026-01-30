// ============================================================
// Types re-exported from Zod schemas (source of truth)
// ============================================================
// All data types are now derived from Zod schemas via z.infer.
// This file re-exports them for backward compatibility so that
// existing imports like `import type { Client } from '../types'`
// continue to work without changes.
// ============================================================

export type {
  Currency,
  Client,
  LineItem,
  SavedItem,
  CustomField,
  PartBStatus,
  Invoice,
  VATRate,
  IssuerSettings,
  AppSettings,
  AssetClass,
  AssetEntry,
  NetWorthSnapshot,
  NetWorthSnapshotV2,
  AnyNetWorthSnapshot,
  BankProvider,
  Expense,
  CategoryMapping,
  ParsedTransaction,
  CryptoWallet,
  TokenPosition,
} from '../schemas';

// ============================================================
// Crypto Portfolio state (not schema-backed, runtime only)
// ============================================================

import type { CryptoWallet, TokenPosition } from '../schemas';

export interface CryptoPortfolioState {
  wallets: CryptoWallet[];
  positions: TokenPosition[];
  lastSyncAt: string | null;
  syncing: boolean;
}

// ============================================================
// Types NOT backed by schemas (display / derived types)
// ============================================================

import type { Invoice, IssuerSettings, AssetClass } from '../schemas';
import type { AnyNetWorthSnapshot, NetWorthSnapshotV2 } from '../schemas';

export interface InvoiceMetadata {
  version: string;
  invoice: Invoice;
  issuer: IssuerSettings;
}

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

// ============================================================
// Runtime helpers (kept here for backward compatibility)
// ============================================================

export const isV2Snapshot = (snapshot: AnyNetWorthSnapshot): snapshot is NetWorthSnapshotV2 => {
  return 'version' in snapshot && snapshot.version === 2;
};
