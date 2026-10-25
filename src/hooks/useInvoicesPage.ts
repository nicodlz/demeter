import { generateId } from "@/utils/id";
import { useState, useRef, useMemo, useCallback } from "react";
import { useInvoices } from "@/hooks/useInvoices";
import { useSettings } from "@/hooks/useSettings";
import { useClients } from "@/hooks/useClients";
import { useExpenses } from "@/hooks/useExpenses";
import { useToast } from "@/hooks/useToast";
import type { Invoice } from "@/schemas";
import {
  calculateInvoiceTotal,
  calculateSplitRatio,
} from "@/utils/invoiceCalculations";
import { toCalendarDate } from "@/utils/date";

export const useInvoicesPage = () => {
  const { invoices, addInvoice, updateInvoice, deleteInvoice } = useInvoices();
  const { settings } = useSettings();
  const { addClient, getClientById } = useClients();
  const { expenses, addExpense, updateExpense, deleteExpense } = useExpenses();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [recibosVerdeInvoice, setRecibosVerdeInvoice] =
    useState<Invoice | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Build a map of invoice numbers that have an associated income entry
  const invoiceIncomeMap = useMemo(() => {
    const map = new Map<string, string>(); // invoiceNumber -> expense id
    for (const exp of expenses) {
      if (
        exp.type === "income" &&
        exp.sourceProvider === "invoice" &&
        exp.source
      ) {
        const match = exp.source.match(/^Invoice\s+(.+)$/);
        if (match) {
          map.set(match[1], exp.id);
        }
      }
    }
    return map;
  }, [expenses]);

  const createIncomeFromInvoice = useCallback(
    (invoice: Invoice, paidAt?: string) => {
      // Idempotent: clicking "mark as paid" twice must not duplicate income.
      if (invoiceIncomeMap.has(invoice.number)) return;

      const total = calculateInvoiceTotal(invoice);
      const currency = invoice.currency || settings.defaultCurrency || "USD";
      addExpense({
        type: "income",
        amount: total,
        currency,
        date: toCalendarDate(paidAt ?? invoice.paidAt ?? invoice.date),
        description: `Invoice ${invoice.number} - ${invoice.client.name}`,
        source: `Invoice ${invoice.number}`,
        sourceProvider: "invoice",
        category: "invoices",
      });
    },
    [addExpense, settings.defaultCurrency, invoiceIncomeMap],
  );

  const removeIncomeForInvoice = useCallback(
    (invoiceNumber: string) => {
      const expenseId = invoiceIncomeMap.get(invoiceNumber);
      if (expenseId) {
        deleteExpense(expenseId);
      }
    },
    [invoiceIncomeMap, deleteExpense],
  );

  const updateIncomeForInvoice = useCallback(
    (previous: Invoice, next: Invoice) => {
      const expenseId = invoiceIncomeMap.get(previous.number);
      if (!expenseId) return;

      updateExpense(expenseId, {
        amount: calculateInvoiceTotal(next),
        currency: next.currency || settings.defaultCurrency || "USD",
        date: toCalendarDate(next.paidAt ?? previous.paidAt ?? next.date),
        description: `Invoice ${next.number} - ${next.client.name}`,
        source: `Invoice ${next.number}`,
      });
    },
    [invoiceIncomeMap, updateExpense, settings.defaultCurrency],
  );

  const processImportedInvoice = (importedInvoice: Invoice): boolean => {
    if (invoices.some((item) => item.number === importedInvoice.number)) {
      return false;
    }

    let clientId = importedInvoice.client.id;
    const existingClient = getClientById(clientId);

    if (!existingClient) {
      const newClient = addClient(importedInvoice.client);
      clientId = newClient.id;
    }

    const invoiceToAdd: Invoice = {
      ...importedInvoice,
      id: generateId(),
      client: existingClient || { ...importedInvoice.client, id: clientId },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addInvoice(invoiceToAdd);
    return true;
  };

  const handleAddInvoice = (invoice: Invoice) => {
    addInvoice(invoice);
    setShowForm(false);
  };

  const handleUpdateInvoice = (invoice: Invoice) => {
    if (!editingInvoice) return;

    updateInvoice(editingInvoice.id, invoice);

    if (editingInvoice.paid && invoice.paid) {
      updateIncomeForInvoice(editingInvoice, invoice);
    } else if (editingInvoice.paid && !invoice.paid) {
      removeIncomeForInvoice(editingInvoice.number);
    } else if (!editingInvoice.paid && invoice.paid) {
      createIncomeFromInvoice(invoice, invoice.paidAt);
    }

    setEditingInvoice(null);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowForm(false);
  };

  const handleDeleteInvoice = (id: string) => {
    const invoice = invoices.find((item) => item.id === id);
    if (invoice) removeIncomeForInvoice(invoice.number);
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
    createIncomeFromInvoice(invoice, invoice.paidAt);
  };

  const downloadPDF = async (
    invoice: Invoice,
    filename: string,
  ): Promise<void> => {
    const { generateInvoicePDF } = await import("@/services/pdfGenerator");
    const pdfBlob = await generateInvoicePDF(invoice, settings.issuer);
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGeneratePDF = async (invoice: Invoice) => {
    try {
      await downloadPDF(invoice, `Invoice_${invoice.number}.pdf`);
    } catch {
      toast.error("Error generating PDF");
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
        await downloadPDF(
          modifiedInvoice,
          `Invoice_${modifiedInvoice.number}.pdf`,
        );
      } else {
        const total = calculateInvoiceTotal(invoice);
        const ratio = calculateSplitRatio(invoice.splitAmount, total);

        const modifiedInvoice: Invoice = {
          ...invoice,
          number: `${invoice.number}-B`,
          lineItems: invoice.lineItems.map((item) => ({
            ...item,
            unitPrice: item.unitPrice * ratio,
          })),
        };

        await downloadPDF(
          modifiedInvoice,
          `Invoice_${modifiedInvoice.number}.pdf`,
        );
      }
    } catch {
      toast.error("Error generating split PDF");
    }
  };

  const handleImportPDF = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { extractInvoiceFromPDF } = await import("@/services/pdfGenerator");
      const metadata = await extractInvoiceFromPDF(file);
      if (!metadata) {
        toast.error(
          "Unable to extract data from PDF. The file does not contain valid metadata.",
        );
        return;
      }

      if (processImportedInvoice(metadata.invoice)) {
        toast.success(
          `Invoice ${metadata.invoice.number} imported successfully!`,
        );
      } else {
        toast.error(`Invoice ${metadata.invoice.number} already exists.`);
      }
    } catch {
      toast.error("Error importing PDF");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImportZIP = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const filename of Object.keys(zipContent.files)) {
        const zipEntry = zipContent.files[filename];

        if (zipEntry.dir || !filename.toLowerCase().endsWith(".pdf")) {
          continue;
        }

        try {
          const pdfBlob = await zipEntry.async("blob");
          const pdfFile = new File([pdfBlob], filename, {
            type: "application/pdf",
          });
          const { extractInvoiceFromPDF } =
            await import("@/services/pdfGenerator");
          const metadata = await extractInvoiceFromPDF(pdfFile);

          if (!metadata) {
            failCount++;
            errors.push(`${filename}: No valid metadata found`);
            continue;
          }

          if (processImportedInvoice(metadata.invoice)) {
            successCount++;
          } else {
            failCount++;
            errors.push(
              `${filename}: Invoice ${metadata.invoice.number} already exists`,
            );
          }
        } catch (error) {
          failCount++;
          errors.push(
            `${filename}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      if (failCount > 0) {
        toast.error(`${successCount} imported, ${failCount} file(s) failed`);
      } else {
        toast.success(`${successCount} invoice(s) imported successfully`);
      }
    } catch {
      toast.error("Error importing ZIP file");
    } finally {
      if (zipInputRef.current) {
        zipInputRef.current.value = "";
      }
    }
  };

  const sortedInvoices = [...invoices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
