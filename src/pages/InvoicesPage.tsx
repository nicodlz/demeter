import { useState, useRef, useMemo, useCallback } from 'react';
import { useInvoices } from '@/hooks/useInvoices';
import { useSettings } from '@/hooks/useSettings';
import { useClients } from '@/hooks/useClients';
import { useExpenses } from '@/hooks/useExpenses';
import type { Invoice } from '@/schemas';
import { InvoiceForm } from '@/components/InvoiceForm';
import { RecibosVerdeModal } from '@/components/RecibosVerdeModal';
import { generateInvoicePDF, extractInvoiceFromPDF } from '@/services/pdfGenerator';
import { getCurrencySymbol, formatDate } from '@/utils/formatters';
import { calculateInvoiceTotal, calculateSplitRatio } from '@/utils/invoiceCalculations';
import JSZip from 'jszip';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MoreHorizontal, Plus, Upload, FileArchive, Download, FileText, Pencil, Trash2, CircleDollarSign } from 'lucide-react';

export const InvoicesPage = () => {
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
        // source format: "Invoice INV-XXX"
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
      // Create income entry when marking as paid
      createIncomeFromInvoice(invoice, paidAt);
    } else {
      // Remove income entry when unmarking as paid
      removeIncomeForInvoice(invoice.number);
    }
  };

  const handleRecordAsIncome = (invoice: Invoice) => {
    if (!invoice.paid) return;
    const paidAt = invoice.paidAt || new Date().toISOString();
    createIncomeFromInvoice(invoice, paidAt);
  };

  const handleGeneratePDF = async (invoice: Invoice) => {
    try {
      await downloadPDF(invoice, `Invoice_${invoice.number}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF');
    }
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

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Invoices</h2>
            <p className="text-sm text-muted-foreground">
              Manage your invoices and create new ones
            </p>
          </div>
          {!showForm && !editingInvoice && (
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleImportPDF}
                className="hidden"
              />
              <input
                ref={zipInputRef}
                type="file"
                accept="application/zip,.zip"
                onChange={handleImportZIP}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[44px] sm:min-h-0"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => zipInputRef.current?.click()}
                className="min-h-[44px] sm:min-h-0"
              >
                <FileArchive className="mr-2 h-4 w-4" />
                Import ZIP
              </Button>
              <Button size="sm" onClick={() => setShowForm(true)} className="min-h-[44px] sm:min-h-0">
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            </div>
          )}
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>New Invoice</CardTitle>
              <CardDescription>Create a new invoice for your client</CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceForm onSubmit={handleAddInvoice} onCancel={handleCancel} />
            </CardContent>
          </Card>
        )}

        {editingInvoice && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Invoice</CardTitle>
              <CardDescription>Modify invoice details</CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceForm
                invoice={editingInvoice}
                onSubmit={handleUpdateInvoice}
                onCancel={handleCancel}
              />
            </CardContent>
          </Card>
        )}

        {recibosVerdeInvoice && recibosVerdeInvoice.splitAmount && (
          <RecibosVerdeModal
            invoice={recibosVerdeInvoice}
            splitAmount={recibosVerdeInvoice.splitAmount}
            onClose={() => setRecibosVerdeInvoice(null)}
          />
        )}

        <Card>
          <CardContent className="p-0">
            {invoices.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No invoices yet. Start by creating your first invoice.
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="hidden md:table-cell">Due Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium whitespace-nowrap">{invoice.number}</TableCell>
                      <TableCell className="max-w-[120px] sm:max-w-none truncate">{invoice.client.name}</TableCell>
                      <TableCell className="hidden sm:table-cell whitespace-nowrap">{formatDate(invoice.date)}</TableCell>
                      <TableCell className="hidden md:table-cell whitespace-nowrap">{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {getCurrencySymbol(invoice.currency || settings.defaultCurrency || 'USD')}
                        {calculateInvoiceTotal(invoice).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant={invoice.paid ? 'default' : 'secondary'}
                                className="cursor-pointer"
                                onClick={() => handleTogglePaid(invoice)}
                              >
                                {invoice.paid ? 'Paid' : 'Pending'}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {invoice.paid && invoice.paidAt
                                ? `Paid on ${formatDate(invoice.paidAt)}`
                                : 'Click to mark as paid'}
                            </TooltipContent>
                          </Tooltip>
                          {invoiceIncomeMap.has(invoice.number) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <CircleDollarSign className="h-4 w-4 text-green-500" />
                              </TooltipTrigger>
                              <TooltipContent>Recorded as income in Cash Flow</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {invoice.splitEnabled && invoice.splitAmount && invoice.splitAmount > 0 ? (
                              <>
                                <DropdownMenuItem onClick={() => handleGenerateSplitPDF(invoice, true)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download Part A
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGenerateSplitPDF(invoice, false)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download Part B
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setRecibosVerdeInvoice(invoice)}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Recibo Verde
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem onClick={() => handleGeneratePDF(invoice)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download PDF
                              </DropdownMenuItem>
                            )}
                            {invoice.paid && !invoiceIncomeMap.has(invoice.number) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleRecordAsIncome(invoice)}>
                                  <CircleDollarSign className="mr-2 h-4 w-4" />
                                  Record as Income
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete invoice {invoice.number}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteInvoice(invoice.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};
