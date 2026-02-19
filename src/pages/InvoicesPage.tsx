import { useInvoicesPage } from '@/hooks/useInvoicesPage';
import { InvoiceForm } from '@/components/InvoiceForm';
import { RecibosVerdeModal } from '@/components/RecibosVerdeModal';
import { getCurrencySymbol, formatDate } from '@/utils/formatters';
import { calculateInvoiceTotal } from '@/utils/invoiceCalculations';

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
  const {
    showForm,
    setShowForm,
    editingInvoice,
    setEditingInvoice,
    recibosVerdeInvoice,
    setRecibosVerdeInvoice,
    fileInputRef,
    zipInputRef,
    invoices,
    sortedInvoices,
    invoiceIncomeMap,
    settings,
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
  } = useInvoicesPage();

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
