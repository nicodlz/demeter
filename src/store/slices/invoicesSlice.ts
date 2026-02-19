import type { StateCreator } from 'zustand';
import type { Invoice } from '../../schemas';
import type { StoreState, InvoicesSlice } from '../types';

export const createInvoicesSlice: StateCreator<
  StoreState,
  [],
  [],
  InvoicesSlice
> = (set) => ({
  invoices: [],

  addInvoice: (invoice: Invoice) => {
    set((state) => ({ invoices: [...state.invoices, invoice] }));
    return invoice;
  },

  updateInvoice: (id, invoiceData) => {
    set((state) => ({
      invoices: state.invoices.map((invoice) =>
        invoice.id === id
          ? { ...invoice, ...invoiceData, updatedAt: new Date().toISOString() }
          : invoice
      ),
    }));
  },

  deleteInvoice: (id) => {
    set((state) => ({
      invoices: state.invoices.filter((invoice) => invoice.id !== id),
    }));
  },
});
