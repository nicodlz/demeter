import { useState, useEffect } from 'react';
import type { Invoice } from '../types';
import { invoiceSchema } from '../schemas';
import { storage, STORAGE_KEYS } from '../utils/storage';

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    storage.get<Invoice[]>(STORAGE_KEYS.INVOICES, [])
  );

  useEffect(() => {
    storage.set(STORAGE_KEYS.INVOICES, invoices);
  }, [invoices]);

  const addInvoice = (invoice: Invoice) => {
    const result = invoiceSchema.safeParse(invoice);
    if (!result.success) {
      console.error('[Demeter] Invalid invoice data:', result.error.issues);
      return invoice;
    }
    setInvoices((prev) => [...prev, result.data]);
    return result.data;
  };

  const updateInvoice = (id: string, invoiceData: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((invoice) => {
        if (invoice.id !== id) return invoice;
        const updated = { ...invoice, ...invoiceData, updatedAt: new Date().toISOString() };
        const result = invoiceSchema.safeParse(updated);
        if (!result.success) {
          console.error('[Demeter] Invalid invoice update:', result.error.issues);
          return invoice;
        }
        return result.data;
      })
    );
  };

  const deleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((invoice) => invoice.id !== id));
  };

  const getInvoiceById = (id: string) => {
    return invoices.find((invoice) => invoice.id === id);
  };

  const getInvoiceByNumber = (number: string) => {
    return invoices.find((invoice) => invoice.number === number);
  };

  return {
    invoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceById,
    getInvoiceByNumber,
  };
};
