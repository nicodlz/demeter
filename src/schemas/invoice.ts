import { z } from 'zod';
import { currencySchema, clientSchema } from './client';

export const lineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  vatRate: z.number(),
  type: z.enum(['goods', 'service', 'mixed', 'expense']),
});

export const savedItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  unit: z.string(),
  unitPrice: z.number(),
  type: z.enum(['goods', 'service', 'mixed', 'expense']),
  defaultQuantity: z.number(),
  createdAt: z.string(),
  usageCount: z.number(),
});

export const customFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
});

export const partBStatusSchema = z.object({
  sent: z.boolean(),
  sentAt: z.string().optional(),
  atcud: z.string().optional(),
  seriesCode: z.string().optional(),
  sequenceNumber: z.number().optional(),
  locked: z.boolean(),
  error: z.string().optional(),
});

export const invoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  date: z.string(),
  dueDate: z.string(),
  client: clientSchema,
  lineItems: z.array(lineItemSchema),
  customFields: z.array(customFieldSchema),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  applyVAT: z.boolean(),
  vatCountry: z.string(),
  vatExemptionReason: z.string().optional(),
  splitEnabled: z.boolean().optional(),
  splitAmount: z.number().optional(),
  partB: partBStatusSchema.optional(),
  currency: currencySchema,
  paid: z.boolean().optional(),
  paidAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type LineItem = z.infer<typeof lineItemSchema>;
export type SavedItem = z.infer<typeof savedItemSchema>;
export type CustomField = z.infer<typeof customFieldSchema>;
export type PartBStatus = z.infer<typeof partBStatusSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
