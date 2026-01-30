import { z } from 'zod';
import { currencySchema } from './client';

export const bankProviderSchema = z.enum(['deblock', 'bourso', 'gnosis_pay', 'etherfi', 'manual']);

export const expenseTypeSchema = z.enum(['expense', 'income']);

export const expenseSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  currency: currencySchema,
  category: z.string().optional(),
  source: z.string(),
  sourceProvider: bankProviderSchema,
  merchantName: z.string().optional(),
  cardLastFour: z.string().optional(),
  originalLine: z.string().optional(),
  type: expenseTypeSchema.default('expense'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const categoryMappingSchema = z.object({
  id: z.string(),
  normalizedMerchant: z.string(),
  category: z.string(),
  createdAt: z.string(),
});

export const parsedTransactionSchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  currency: currencySchema,
  merchantName: z.string().optional(),
  cardLastFour: z.string().optional(),
  isCredit: z.boolean(),
  originalLine: z.string().optional(),
});

export type ExpenseType = z.infer<typeof expenseTypeSchema>;
export type BankProvider = z.infer<typeof bankProviderSchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type CategoryMapping = z.infer<typeof categoryMappingSchema>;
export type ParsedTransaction = z.infer<typeof parsedTransactionSchema>;
