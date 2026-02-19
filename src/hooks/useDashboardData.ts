import { useMemo } from 'react';
import { useInvoices } from './useInvoices';
import type { Invoice, Currency } from '../schemas';

export interface MonthlyRevenue {
  month: string;
  monthLabel: string;
  ht: number;
  vat: number;
  ttc: number;
}

export interface ClientRevenue {
  clientId: string;
  clientName: string;
  totalHT: number;
  totalTTC: number;
  count: number;
  percentage: number;
}

export interface DashboardStats {
  totalTTC: number;
  totalHT: number;
  totalVAT: number;
  invoiceCount: number;
  averageInvoice: number;
  revenueByMonth: MonthlyRevenue[];
  revenueByClient: ClientRevenue[];
}

const calculateInvoiceTotals = (invoice: Invoice) => {
  const ht = invoice.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const vat = invoice.applyVAT
    ? invoice.lineItems.reduce(
        (sum, item) =>
          sum + item.quantity * item.unitPrice * (item.vatRate / 100),
        0
      )
    : 0;
  return { ht, vat, ttc: ht + vat };
};

const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
};

type ConvertFn = (amount: number, fromCurrency: Currency, toCurrency: Currency) => number;

export const useDashboardData = (
  startDate: Date,
  endDate: Date,
  displayCurrency: Currency,
  convert: ConvertFn
): DashboardStats => {
  const { invoices } = useInvoices();

  return useMemo(() => {
    // Filter invoices by date range
    const filteredInvoices = invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.date);
      return invoiceDate >= startDate && invoiceDate <= endDate;
    });

    // Calculate totals
    let totalHT = 0;
    let totalVAT = 0;
    let totalTTC = 0;

    // Group by month
    const monthlyMap = new Map<string, { ht: number; vat: number; ttc: number }>();

    // Group by client
    const clientMap = new Map<
      string,
      { clientName: string; totalHT: number; totalTTC: number; count: number }
    >();

    filteredInvoices.forEach((invoice) => {
      const totals = calculateInvoiceTotals(invoice);
      const invoiceCurrency = invoice.currency || 'USD';

      // Convert amounts to display currency
      const convertedHT = convert(totals.ht, invoiceCurrency, displayCurrency);
      const convertedVAT = convert(totals.vat, invoiceCurrency, displayCurrency);
      const convertedTTC = convert(totals.ttc, invoiceCurrency, displayCurrency);

      totalHT += convertedHT;
      totalVAT += convertedVAT;
      totalTTC += convertedTTC;

      // Monthly aggregation
      const monthKey = getMonthKey(new Date(invoice.date));
      const existing = monthlyMap.get(monthKey) || { ht: 0, vat: 0, ttc: 0 };
      monthlyMap.set(monthKey, {
        ht: existing.ht + convertedHT,
        vat: existing.vat + convertedVAT,
        ttc: existing.ttc + convertedTTC,
      });

      // Client aggregation
      const clientId = invoice.client.id;
      const clientData = clientMap.get(clientId) || {
        clientName: invoice.client.name,
        totalHT: 0,
        totalTTC: 0,
        count: 0,
      };
      clientMap.set(clientId, {
        clientName: invoice.client.name,
        totalHT: clientData.totalHT + convertedHT,
        totalTTC: clientData.totalTTC + convertedTTC,
        count: clientData.count + 1,
      });
    });

    // Convert monthly map to sorted array
    const revenueByMonth: MonthlyRevenue[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        monthLabel: getMonthLabel(month),
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Convert client map to sorted array with percentages
    const revenueByClient: ClientRevenue[] = Array.from(clientMap.entries())
      .map(([clientId, data]) => ({
        clientId,
        ...data,
        percentage: totalTTC > 0 ? (data.totalTTC / totalTTC) * 100 : 0,
      }))
      .sort((a, b) => b.totalTTC - a.totalTTC);

    return {
      totalTTC,
      totalHT,
      totalVAT,
      invoiceCount: filteredInvoices.length,
      averageInvoice:
        filteredInvoices.length > 0 ? totalTTC / filteredInvoices.length : 0,
      revenueByMonth,
      revenueByClient,
    };
  }, [invoices, startDate, endDate, displayCurrency, convert]);
};
