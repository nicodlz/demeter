import { useState, useEffect } from 'react';
import type { Invoice } from '../types';
import { storage, STORAGE_KEYS } from '../utils/storage';

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    storage.get<Invoice[]>(STORAGE_KEYS.INVOICES, [])
  );

  useEffect(() => {
    storage.set(STORAGE_KEYS.INVOICES, invoices);
  }, [invoices]);

  const addInvoice = (invoice: Invoice) => {
    setInvoices((prev) => [...prev, invoice]);
    return invoice;
  };

  const updateInvoice = (id: string, invoiceData: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((invoice) =>
        invoice.id === id
          ? { ...invoice, ...invoiceData, updatedAt: new Date().toISOString() }
          : invoice
      )
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
