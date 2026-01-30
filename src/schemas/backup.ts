import { z } from 'zod';
import { clientSchema } from './client';
import { invoiceSchema, savedItemSchema } from './invoice';
import { appSettingsSchema } from './settings';
import { anyNetWorthSnapshotSchema } from './netWorth';
import { expenseSchema, categoryMappingSchema } from './expense';

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
  }),
});

export type DemeterBackup = z.infer<typeof demeterBackupSchema>;
