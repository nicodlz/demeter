import { z } from 'zod';
import { currencySchema } from './client';

export const vatRateSchema = z.object({
  country: z.string(),
  countryCode: z.string(),
  rates: z.array(z.number()),
  defaultRate: z.number(),
});

export const issuerSettingsSchema = z.object({
  companyName: z.string(),
  address: z.string(),
  postalCode: z.string(),
  city: z.string(),
  country: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  siret: z.string().optional(),
  nif: z.string().optional(),
  vatNumber: z.string().optional(),
  legalForm: z.string().optional(),
  capital: z.string().optional(),
  rcs: z.string().optional(),
  additionalLegalMentions: z.string().optional(),
});

export const appSettingsSchema = z.object({
  issuer: issuerSettingsSchema,
  invoiceCounter: z.number(),
  invoiceNumberFormat: z.string(),
  defaultPaymentTerms: z.string(),
  vatRates: z.array(vatRateSchema),
  defaultCurrency: currencySchema,
  dashboardCurrency: currencySchema,
  privacyMode: z.boolean().optional(),
  partBCounter: z.number().optional(),
  partBSeriesCode: z.string().optional(),
  partBSeriesPrefix: z.string().optional(),
  zerionApiKey: z.string().optional(),
  ibkrFlexToken: z.string().optional(),
  ibkrFlexQueryId: z.string().optional(),
});

export type VATRate = z.infer<typeof vatRateSchema>;
export type IssuerSettings = z.infer<typeof issuerSettingsSchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;
