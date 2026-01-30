import { useCallback } from 'react';
import { useStore } from '../store';

export const useInvoices = () => {
  const invoices = useStore((state) => state.invoices);
  const addInvoice = useStore((state) => state.addInvoice);
  const updateInvoice = useStore((state) => state.updateInvoice);
  const deleteInvoice = useStore((state) => state.deleteInvoice);

  const getInvoiceById = useCallback(
    (id: string) => invoices.find((invoice) => invoice.id === id),
    [invoices]
  );

  const getInvoiceByNumber = useCallback(
    (number: string) => invoices.find((invoice) => invoice.number === number),
    [invoices]
  );

  return {
    invoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceById,
    getInvoiceByNumber,
  };
};
