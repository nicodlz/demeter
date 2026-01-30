import { z } from 'zod';
import { currencySchema } from './client';

export const assetClassSchema = z.enum(['stocks', 'crypto', 'cash', 'stablecoins']);

export const assetEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  currency: currencySchema,
});

// V1: Simple flat structure (legacy)
export const netWorthSnapshotSchema = z.object({
  id: z.string(),
  date: z.string(),
  stocks: z.number(),
  crypto: z.number(),
  cash: z.number(),
  stablecoins: z.number(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// V2: Subcategories with multi-currency support
export const netWorthSnapshotV2Schema = z.object({
  id: z.string(),
  date: z.string(),
  version: z.literal(2),
  stocks: z.array(assetEntrySchema),
  crypto: z.array(assetEntrySchema),
  cash: z.array(assetEntrySchema),
  stablecoins: z.array(assetEntrySchema),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Union schema: V2 first (more specific due to `version: 2` literal)
export const anyNetWorthSnapshotSchema = z.union([
  netWorthSnapshotV2Schema,
  netWorthSnapshotSchema,
]);

export type AssetClass = z.infer<typeof assetClassSchema>;
export type AssetEntry = z.infer<typeof assetEntrySchema>;
export type NetWorthSnapshot = z.infer<typeof netWorthSnapshotSchema>;
export type NetWorthSnapshotV2 = z.infer<typeof netWorthSnapshotV2Schema>;
export type AnyNetWorthSnapshot = z.infer<typeof anyNetWorthSnapshotSchema>;
