// ============================================================
// Runtime / display types (NOT backed by Zod schemas)
// ============================================================
// Schema-backed types (Client, Invoice, Currency, etc.) should
// be imported directly from '@/schemas' or the relevant schema
// module. This file only holds types that have no schema equivalent.
// ============================================================

import type { CryptoWallet, TokenPosition } from '@/schemas';
import type { Invoice, IssuerSettings, AssetClass } from '@/schemas';
import type { AnyNetWorthSnapshot, NetWorthSnapshotV2 } from '@/schemas';

// ============================================================
// Crypto Portfolio state (runtime only)
// ============================================================

export interface CryptoPortfolioState {
  wallets: CryptoWallet[];
  positions: TokenPosition[];
  lastSyncAt: string | null;
  syncing: boolean;
}

// ============================================================
// Display / derived types
// ============================================================

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
// Runtime helpers
// ============================================================

export const isV2Snapshot = (snapshot: AnyNetWorthSnapshot): snapshot is NetWorthSnapshotV2 => {
  return 'version' in snapshot && snapshot.version === 2;
};
