import { useState, useRef, useEffect, useMemo } from 'react';
import type { Invoice, LineItem, CustomField, Currency, SavedItem } from '@/types';
import { useClients } from '@/hooks/useClients';
import { useSettings } from '@/hooks/useSettings';
import { useSavedItems } from '@/hooks/useSavedItems';
import { generateInvoiceNumber, parseInvoiceNumber } from '@/utils/invoiceNumber';
import { useInvoices } from '@/hooks/useInvoices';
import { getCurrencySymbol } from '@/utils/formatters';
import {
  calculateSubtotal as calcSubtotal,
  calculateVAT as calcVAT,
  calculateTotal as calcTotal,
  calculateSplitPercentage,
} from '@/utils/invoiceCalculations';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, X, Trash2 } from 'lucide-react';

interface InvoiceFormProps {
  invoice?: Invoice;
  onSubmit: (invoice: Invoice) => void;
  onCancel: () => void;
}

export const InvoiceForm = ({ invoice, onSubmit, onCancel }: InvoiceFormProps) => {
  const { clients } = useClients();
  const { settings } = useSettings();
  const { invoices: existingInvoices } = useInvoices();
  const { savedItems, saveFromLineItem, incrementUsage, getMostUsedItems, deleteSavedItem } = useSavedItems();

  const [activeAutocomplete, setActiveAutocomplete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const [selectedClientId, setSelectedClientId] = useState(
    invoice?.client.id || ''
  );
  const [date, setDate] = useState(
    invoice?.date || new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice?.lineItems || [
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unit: 'day',
        unitPrice: 0,
        vatRate: settings.vatRates[0]?.defaultRate || 20,
        type: 'service',
      },
    ]
  );
  const [customFields, setCustomFields] = useState<CustomField[]>(
    invoice?.customFields || []
  );
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [paymentTerms, setPaymentTerms] = useState(
    invoice?.paymentTerms || settings.defaultPaymentTerms
  );
  const [applyVAT, setApplyVAT] = useState(invoice?.applyVAT ?? true);
  const [vatCountry, setVatCountry] = useState(
    invoice?.vatCountry || settings.vatRates[0]?.countryCode || 'FR'
  );
  const [vatExemptionReason, setVatExemptionReason] = useState(
    invoice?.vatExemptionReason || 'VAT not applicable, art. 293 B of CGI (France)'
  );
  const [splitEnabled, setSplitEnabled] = useState(invoice?.splitEnabled || false);
  const [splitAmount, setSplitAmount] = useState(invoice?.splitAmount || 0);
  const [currency, setCurrency] = useState<Currency>(
    invoice?.currency || settings.defaultCurrency || 'USD'
  );

  const currencySymbol = getCurrencySymbol(currency);

  const selectedVatRate = settings.vatRates.find(
    (rate) => rate.countryCode === vatCountry
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setActiveAutocomplete(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFilteredSavedItems = (itemId: string): SavedItem[] => {
    const query = searchQuery[itemId]?.toLowerCase() || '';
    if (!query) return getMostUsedItems(5);
    return savedItems.filter((item) =>
      item.description.toLowerCase().includes(query)
    ).slice(0, 5);
  };

  const applySavedItem = (lineItemId: string, savedItem: SavedItem) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === lineItemId
          ? {
              ...item,
              description: savedItem.description,
              unit: savedItem.unit,
              unitPrice: savedItem.unitPrice,
              type: savedItem.type,
              quantity: savedItem.defaultQuantity,
            }
          : item
      )
    );
    incrementUsage(savedItem.id);
    setActiveAutocomplete(null);
    setSearchQuery((prev) => ({ ...prev, [lineItemId]: '' }));
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unit: 'day',
        unitPrice: 0,
        vatRate: selectedVatRate?.defaultRate || 20,
        type: 'service',
      },
    ]);
  };

  const updateLineItem = <K extends keyof LineItem>(
    id: string,
    field: K,
    value: LineItem[K]
  ) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      { id: crypto.randomUUID(), label: '', value: '' },
    ]);
  };

  const updateCustomField = (
    id: string,
    field: 'label' | 'value',
    value: string
  ) => {
    setCustomFields(
      customFields.map((cf) => (cf.id === id ? { ...cf, [field]: value } : cf))
    );
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter((cf) => cf.id !== id));
  };

  const subtotal = useMemo(() => calcSubtotal(lineItems), [lineItems]);
  const vat = useMemo(() => calcVAT(lineItems, applyVAT), [lineItems, applyVAT]);
  const total = useMemo(() => calcTotal(lineItems, applyVAT), [lineItems, applyVAT]);
  const splitPercentage = useMemo(
    () => calculateSplitPercentage(splitAmount, total),
    [splitAmount, total]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedClient = clients.find((c) => c.id === selectedClientId);
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }

    lineItems.forEach((item) => {
      if (item.description.trim()) {
        saveFromLineItem(item);
      }
    });

    const invoiceNumber =
      invoice?.number ||
      (() => {
        const currentYear = new Date().getFullYear().toString();
        const maxCounter = existingInvoices
          .filter((i) => i.number.startsWith(currentYear))
          .map((i) => parseInvoiceNumber(i.number) || 0)
          .reduce((max, n) => Math.max(max, n), 0);
        return generateInvoiceNumber(maxCounter + 1, settings.invoiceNumberFormat);
      })();

    const newInvoice: Invoice = {
      id: invoice?.id || crypto.randomUUID(),
      number: invoiceNumber,
      date,
      dueDate,
      client: selectedClient,
      lineItems,
      customFields: customFields.filter((cf) => cf.label && cf.value),
      notes,
      paymentTerms,
      applyVAT,
      vatCountry,
      vatExemptionReason: applyVAT ? undefined : vatExemptionReason,
      splitEnabled,
      splitAmount: splitEnabled ? splitAmount : undefined,
      currency,
      createdAt: invoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(newInvoice);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client and Dates */}
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger id="client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Invoice Date *</Label>
            <Input
              type="date"
              id="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input
              type="date"
              id="dueDate"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency *</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* VAT Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>VAT Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="applyVAT"
              checked={applyVAT}
              onCheckedChange={(checked) => setApplyVAT(checked === true)}
            />
            <Label htmlFor="applyVAT" className="cursor-pointer">Apply VAT</Label>
          </div>

          {applyVAT ? (
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="vatCountry">Country (VAT)</Label>
              <Select value={vatCountry} onValueChange={setVatCountry}>
                <SelectTrigger id="vatCountry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.vatRates.map((rate) => (
                    <SelectItem key={rate.countryCode} value={rate.countryCode}>
                      {rate.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="vatExemptionReason">VAT Exemption Reason</Label>
              <Select value={vatExemptionReason} onValueChange={setVatExemptionReason}>
                <SelectTrigger id="vatExemptionReason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VAT not applicable, art. 293 B of CGI (France)">VAT not applicable, art. 293 B of CGI (France)</SelectItem>
                  <SelectItem value="Reverse charge - B2B services outside EU">Reverse charge - B2B services outside EU</SelectItem>
                  <SelectItem value="Reverse charge - Article 196 of EU VAT Directive">Reverse charge - Article 196 of EU VAT Directive</SelectItem>
                  <SelectItem value="Intra-community supply - Article 138 of EU VAT Directive">Intra-community supply - Article 138</SelectItem>
                  <SelectItem value="Export outside EU - Article 146 of EU VAT Directive">Export outside EU - Article 146</SelectItem>
                  <SelectItem value="VAT exempt - Article 261 of CGI (France)">VAT exempt - Article 261 of CGI (France)</SelectItem>
                  <SelectItem value="Place of supply outside EU - services">Place of supply outside EU - services</SelectItem>
                  <SelectItem value="VAT not applicable">VAT not applicable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invoice Lines</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Line
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-12 gap-3 items-end pb-4 border-b last:border-b-0"
            >
              <div className={applyVAT ? "col-span-2 sm:col-span-6 lg:col-span-3" : "col-span-2 sm:col-span-6 lg:col-span-4"} ref={activeAutocomplete === item.id ? autocompleteRef : null}>
                <Label className="text-xs">Description *</Label>
                <div className="relative mt-1">
                  <Input
                    required
                    value={item.description}
                    onChange={(e) => {
                      updateLineItem(item.id, 'description', e.target.value);
                      setSearchQuery((prev) => ({ ...prev, [item.id]: e.target.value }));
                      setActiveAutocomplete(item.id);
                    }}
                    onFocus={() => setActiveAutocomplete(item.id)}
                    placeholder="Start typing..."
                  />
                  {activeAutocomplete === item.id && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                      <div className="px-3 py-1.5 text-xs text-muted-foreground bg-muted border-b">
                        Saved items {savedItems.length > 0 && `(${savedItems.length})`}
                      </div>
                      {getFilteredSavedItems(item.id).length > 0 ? (
                        getFilteredSavedItems(item.id).map((savedItem) => (
                          <div
                            key={savedItem.id}
                            className="flex items-center border-b last:border-b-0"
                          >
                            <button
                              type="button"
                              onClick={() => applySavedItem(item.id, savedItem)}
                              className="flex-1 px-3 py-2 text-left hover:bg-accent"
                            >
                              <div className="text-sm font-medium">{savedItem.description}</div>
                              <div className="text-xs text-muted-foreground">
                                {currencySymbol}{savedItem.unitPrice.toFixed(2)} / {savedItem.unit}
                              </div>
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSavedItem(savedItem.id);
                              }}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                          {savedItems.length === 0
                            ? "No saved items yet."
                            : "No matching items found."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-1 sm:col-span-1 lg:col-span-1">
                <Label className="text-xs">Qty *</Label>
                <Input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) =>
                    updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                  }
                  className="mt-1"
                />
              </div>

              <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                <Label className="text-xs">Unit *</Label>
                <Select value={item.unit} onValueChange={(v) => updateLineItem(item.id, 'unit', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="unit">Unit</SelectItem>
                    <SelectItem value="package">Package</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                <Label className="text-xs">Type *</Label>
                <Select
                  value={item.type}
                  onValueChange={(v) => updateLineItem(item.id, 'type', v as LineItem['type'])}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="goods">Goods</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                <Label className="text-xs">Price *</Label>
                <Input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                  }
                  className="mt-1"
                />
              </div>

              {applyVAT && (
                <div className="col-span-1 sm:col-span-1 lg:col-span-1">
                  <Label className="text-xs">VAT%</Label>
                  <Select
                    value={item.vatRate.toString()}
                    onValueChange={(v) => updateLineItem(item.id, 'vatRate', parseFloat(v))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedVatRate?.rates.map((rate) => (
                        <SelectItem key={rate} value={rate.toString()}>
                          {rate}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="col-span-1 sm:col-span-1 lg:col-span-1 flex justify-end items-end">
                {lineItems.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(item.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{currencySymbol}{subtotal.toFixed(2)}</span>
            </div>
            {applyVAT && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT:</span>
                <span className="font-medium">{currencySymbol}{vat.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{currencySymbol}{total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Fields */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Custom Fields</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
            <Plus className="mr-2 h-4 w-4" />
            Add Field
          </Button>
        </CardHeader>
        <CardContent>
          {customFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom fields. Click "Add Field" to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {customFields.map((field) => (
                <div key={field.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center">
                  <div className="sm:col-span-5">
                    <Input
                      placeholder="Field name"
                      value={field.label}
                      onChange={(e) =>
                        updateCustomField(field.id, 'label', e.target.value)
                      }
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <Input
                      placeholder="Value"
                      value={field.value}
                      onChange={(e) =>
                        updateCustomField(field.id, 'value', e.target.value)
                      }
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomField(field.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes and Payment Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Input
              id="paymentTerms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Split Invoice */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="splitEnabled"
              checked={splitEnabled}
              onCheckedChange={(checked) => {
                setSplitEnabled(checked === true);
                if (checked && splitAmount === 0) {
                  setSplitAmount(total / 2);
                }
              }}
            />
            <Label htmlFor="splitEnabled" className="text-lg font-semibold cursor-pointer">
              Split Invoice
            </Label>
          </div>
        </CardHeader>
        {splitEnabled && (
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-orange-600">
                Part B (orange): {currencySymbol}{splitAmount.toFixed(2)}
              </span>
              <span className="font-medium text-green-600">
                Part A (full invoice): {currencySymbol}{total.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={total}
              step="0.01"
              value={splitAmount}
              onChange={(e) => setSplitAmount(parseFloat(e.target.value))}
              className="w-full h-3 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #f97316 0%, #f97316 ${splitPercentage}%, #10b981 ${splitPercentage}%, #10b981 100%)`
              }}
            />
            <p className="text-xs text-muted-foreground">
              Slide to adjust Part B amount. Part A will be the full original invoice, Part B will be an invoice with only the selected amount.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {invoice ? 'Update' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
};
