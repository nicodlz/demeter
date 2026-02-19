import { useState, useRef, useMemo, useCallback } from 'react';
import { useInvoices } from '@/hooks/useInvoices';
import { useSettings } from '@/hooks/useSettings';
import { useClients } from '@/hooks/useClients';
import { useExpenses } from '@/hooks/useExpenses';
import type { Invoice } from '@/types';
import { generateInvoicePDF, extractInvoiceFromPDF } from '@/services/pdfGenerator';
import { calculateInvoiceTotal, calculateSplitRatio } from '@/utils/invoiceCalculations';
import JSZip from 'jszip';

export const useInvoicesPage = () => {
  const { invoices, addInvoice, updateInvoice, deleteInvoice } = useInvoices();
  const { settings } = useSettings();
  const { addClient, getClientById } = useClients();
  const { expenses, addExpense, deleteExpense } = useExpenses();

  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [recibosVerdeInvoice, setRecibosVerdeInvoice] = useState<Invoice | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Build a map of invoice numbers that have an associated income entry
  const invoiceIncomeMap = useMemo(() => {
    const map = new Map<string, string>(); // invoiceNumber -> expense id
    for (const exp of expenses) {
      if (exp.type === 'income' && exp.sourceProvider === 'invoice' && exp.source) {
        const match = exp.source.match(/^Invoice\s+(.+)$/);
        if (match) {
          map.set(match[1], exp.id);
        }
      }
    }
    return map;
  }, [expenses]);

  const createIncomeFromInvoice = useCallback((invoice: Invoice, _paidAt?: string) => {
    const total = calculateInvoiceTotal(invoice);
    const currency = invoice.currency || settings.defaultCurrency || 'USD';
    addExpense({
      type: 'income',
      amount: total,
      currency,
      date: invoice.date,
      description: `Invoice ${invoice.number} - ${invoice.client.name}`,
      source: `Invoice ${invoice.number}`,
      sourceProvider: 'invoice',
      category: 'invoices',
    });
  }, [addExpense, settings.defaultCurrency]);

  const removeIncomeForInvoice = useCallback((invoiceNumber: string) => {
    const expenseId = invoiceIncomeMap.get(invoiceNumber);
    if (expenseId) {
      deleteExpense(expenseId);
    }
  }, [invoiceIncomeMap, deleteExpense]);

  const processImportedInvoice = (importedInvoice: Invoice): void => {
    let clientId = importedInvoice.client.id;
    const existingClient = getClientById(clientId);

    if (!existingClient) {
      const newClient = addClient(importedInvoice.client);
      clientId = newClient.id;
    }

    const invoiceToAdd: Invoice = {
      ...importedInvoice,
      id: crypto.randomUUID(),
      client: existingClient || { ...importedInvoice.client, id: clientId },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addInvoice(invoiceToAdd);
  };

  const handleAddInvoice = (invoice: Invoice) => {
    addInvoice(invoice);
    setShowForm(false);
  };

  const handleUpdateInvoice = (invoice: Invoice) => {
    if (editingInvoice) {
      updateInvoice(editingInvoice.id, invoice);
      setEditingInvoice(null);
    }
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowForm(false);
  };

  const handleDeleteInvoice = (id: string) => {
    deleteInvoice(id);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingInvoice(null);
  };

  const handleTogglePaid = (invoice: Invoice) => {
    const isPaid = !invoice.paid;
    const paidAt = isPaid ? new Date().toISOString() : undefined;
    updateInvoice(invoice.id, {
      ...invoice,
      paid: isPaid,
      paidAt,
      updatedAt: new Date().toISOString(),
    });

    if (isPaid && paidAt) {
      createIncomeFromInvoice(invoice, paidAt);
    } else {
      removeIncomeForInvoice(invoice.number);
    }
  };

  const handleRecordAsIncome = (invoice: Invoice) => {
    if (!invoice.paid) return;
    const paidAt = invoice.paidAt || new Date().toISOString();
    createIncomeFromInvoice(invoice, paidAt);
  };

  const downloadPDF = async (invoice: Invoice, filename: string): Promise<void> => {
    const pdfBlob = await generateInvoicePDF(invoice, settings.issuer);
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGeneratePDF = async (invoice: Invoice) => {
    try {
      await downloadPDF(invoice, `Invoice_${invoice.number}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF');
    }
  };

  const handleGenerateSplitPDF = async (invoice: Invoice, isPart1: boolean) => {
    try {
      if (!invoice.splitAmount) return;

      if (isPart1) {
        const modifiedInvoice: Invoice = {
          ...invoice,
          number: `${invoice.number}-A`,
        };
        await downloadPDF(modifiedInvoice, `Invoice_${modifiedInvoice.number}.pdf`);
      } else {
        const total = calculateInvoiceTotal(invoice);
        const ratio = calculateSplitRatio(invoice.splitAmount, total);

        const modifiedInvoice: Invoice = {
          ...invoice,
          number: `${invoice.number}-B`,
          lineItems: invoice.lineItems.map(item => ({
            ...item,
            unitPrice: item.unitPrice * ratio,
          })),
        };

        await downloadPDF(modifiedInvoice, `Invoice_${modifiedInvoice.number}.pdf`);
      }
    } catch (error) {
      console.error('Error generating split PDF:', error);
      alert('Error generating split PDF');
    }
  };

  const handleImportPDF = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const metadata = await extractInvoiceFromPDF(file);
      if (!metadata) {
        alert('Unable to extract data from PDF. The file does not contain valid metadata.');
        return;
      }

      processImportedInvoice(metadata.invoice);
      alert(`Invoice ${metadata.invoice.number} imported successfully!`);
    } catch (error) {
      console.error('Error importing PDF:', error);
      alert('Error importing PDF');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportZIP = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const filename of Object.keys(zipContent.files)) {
        const zipEntry = zipContent.files[filename];

        if (zipEntry.dir || !filename.toLowerCase().endsWith('.pdf')) {
          continue;
        }

        try {
          const pdfBlob = await zipEntry.async('blob');
          const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
          const metadata = await extractInvoiceFromPDF(pdfFile);

          if (!metadata) {
            failCount++;
            errors.push(`${filename}: No valid metadata found`);
            continue;
          }

          processImportedInvoice(metadata.invoice);
          successCount++;
        } catch (error) {
          failCount++;
          errors.push(`${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      let message = `Import completed!\n${successCount} invoice(s) imported successfully.`;
      if (failCount > 0) {
        message += `\n${failCount} file(s) failed.`;
        if (errors.length > 0) {
          message += `\n\nErrors:\n${errors.slice(0, 5).join('\n')}`;
          if (errors.length > 5) {
            message += `\n... and ${errors.length - 5} more errors.`;
          }
        }
      }
      alert(message);
    } catch (error) {
      console.error('Error importing ZIP:', error);
      alert('Error importing ZIP file');
    } finally {
      if (zipInputRef.current) {
        zipInputRef.current.value = '';
      }
    }
  };

  const sortedInvoices = [...invoices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    // State
    showForm,
    setShowForm,
    editingInvoice,
    setEditingInvoice,
    recibosVerdeInvoice,
    setRecibosVerdeInvoice,
    // Refs
    fileInputRef,
    zipInputRef,
    // Data
    invoices,
    sortedInvoices,
    invoiceIncomeMap,
    settings,
    // Handlers
    handleAddInvoice,
    handleUpdateInvoice,
    handleEditInvoice,
    handleDeleteInvoice,
    handleCancel,
    handleTogglePaid,
    handleRecordAsIncome,
    handleGeneratePDF,
    handleGenerateSplitPDF,
    handleImportPDF,
    handleImportZIP,
  };
};
