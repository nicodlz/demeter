import { z } from 'zod';

// ============= Asset Category =============
export const ibkrAssetCategorySchema = z.enum([
  'STK',
  'OPT',
  'FUT',
  'CASH',
  'BOND',
  'WAR',
  'FUND',
  'OTHER',
]);

export type IbkrAssetCategory = z.infer<typeof ibkrAssetCategorySchema>;

// ============= Position =============
export const ibkrPositionSchema = z.object({
  accountId: z.string(),
  symbol: z.string(),
  description: z.string(),
  conid: z.string(),
  isin: z.string(),
  assetCategory: z.string(),
  currency: z.string(),
  quantity: z.number(),
  markPrice: z.number(),
  marketValue: z.number(),
  costBasisPrice: z.number(),
  costBasisMoney: z.number(),
  unrealizedPnl: z.number(),
  percentOfNav: z.number(),
});

export type IbkrPosition = z.infer<typeof ibkrPositionSchema>;

// ============= Cash Balance =============
export const ibkrCashBalanceSchema = z.object({
  currency: z.string(),
  endingCash: z.number(),
  endingSettledCash: z.number(),
});

export type IbkrCashBalance = z.infer<typeof ibkrCashBalanceSchema>;

// ============= Account Snapshot =============
export const ibkrAccountSchema = z.object({
  accountId: z.string(),
  nav: z.number(),
  positions: z.array(ibkrPositionSchema),
  cashBalances: z.array(ibkrCashBalanceSchema),
  fetchedAt: z.string(),
});

export type IbkrAccount = z.infer<typeof ibkrAccountSchema>;

// ============= Config =============
export const ibkrConfigSchema = z.object({
  flexToken: z.string(),
  flexQueryId: z.string(),
});

export type IbkrConfig = z.infer<typeof ibkrConfigSchema>;
