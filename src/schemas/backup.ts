import { z } from 'zod';
import { clientSchema } from './client';
import { invoiceSchema, savedItemSchema } from './invoice';
import { appSettingsSchema } from './settings';
import { anyNetWorthSnapshotSchema } from './netWorth';
import { expenseSchema, categoryMappingSchema } from './expense';
import { cryptoWalletSchema, tokenPositionSchema } from './crypto';
import { ibkrPositionSchema, ibkrCashBalanceSchema } from './ibkr';

export const demeterBackupSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  data: z.object({
    settings: appSettingsSchema.nullable(),
    clients: z.array(clientSchema),
    invoices: z.array(invoiceSchema),
    savedItems: z.array(savedItemSchema),
    netWorthSnapshots: z.array(anyNetWorthSnapshotSchema),
    expenses: z.array(expenseSchema),
    categoryMappings: z.array(categoryMappingSchema),
    cryptoWallets: z.array(cryptoWalletSchema).optional(),
    cryptoPositions: z.array(tokenPositionSchema).optional(),
    cryptoLastSync: z.string().nullable().optional(),
    ibkrPositions: z.array(ibkrPositionSchema).optional(),
    ibkrCashBalances: z.array(ibkrCashBalanceSchema).optional(),
    ibkrLastSync: z.string().nullable().optional(),
    ibkrAccountId: z.string().nullable().optional(),
    ibkrNav: z.number().nullable().optional(),
  }),
});

export type DemeterBackup = z.infer<typeof demeterBackupSchema>;
