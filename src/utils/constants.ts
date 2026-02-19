import type { VATRate, AppSettings } from '@/schemas';

export const DEFAULT_VAT_RATES: VATRate[] = [
  {
    country: 'France',
    countryCode: 'FR',
    rates: [0, 2.1, 5.5, 10, 20],
    defaultRate: 20,
  },
  {
    country: 'Germany',
    countryCode: 'DE',
    rates: [0, 7, 19],
    defaultRate: 19,
  },
  {
    country: 'Belgium',
    countryCode: 'BE',
    rates: [0, 6, 12, 21],
    defaultRate: 21,
  },
  {
    country: 'Spain',
    countryCode: 'ES',
    rates: [0, 4, 10, 21],
    defaultRate: 21,
  },
  {
    country: 'Italy',
    countryCode: 'IT',
    rates: [0, 4, 5, 10, 22],
    defaultRate: 22,
  },
  {
    country: 'United Kingdom',
    countryCode: 'GB',
    rates: [0, 5, 20],
    defaultRate: 20,
  },
  {
    country: 'Switzerland',
    countryCode: 'CH',
    rates: [0, 2.5, 3.7, 7.7],
    defaultRate: 7.7,
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  issuer: {
    companyName: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'France',
    email: '',
    phone: '',
    siret: '',
    vatNumber: '',
    legalForm: '',
    capital: '',
    rcs: '',
    additionalLegalMentions: '',
  },
  invoiceCounter: 0,
  invoiceNumberFormat: 'YYYY-NNN',
  defaultPaymentTerms: 'Payment upon receipt',
  vatRates: DEFAULT_VAT_RATES,
  defaultCurrency: 'USD',
  dashboardCurrency: 'USD',
  taxProvisionEnabled: false,
  taxRate: 30,
};
