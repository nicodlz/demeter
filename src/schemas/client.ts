import { z } from 'zod';

export const currencySchema = z.enum(['EUR', 'USD']);

export const clientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  siret: z.string().optional(),
  nif: z.string().optional(),
  vatNumber: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryPostalCode: z.string().optional(),
  deliveryCity: z.string().optional(),
  deliveryCountry: z.string().optional(),
  additionalInfo: z.string().optional(),
});

export type Currency = z.infer<typeof currencySchema>;
export type Client = z.infer<typeof clientSchema>;
