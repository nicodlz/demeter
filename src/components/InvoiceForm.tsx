import type { Invoice } from '@/schemas';
import { useInvoiceForm } from '@/hooks/useInvoiceForm';

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
import { Plus, X } from 'lucide-react';

import { VATSection } from '@/components/invoice/VATSection';
import { LineItemsEditor } from '@/components/invoice/LineItemsEditor';

interface InvoiceFormProps {
  invoice?: Invoice;
  onSubmit: (invoice: Invoice) => void;
  onCancel: () => void;
}

export const InvoiceForm = ({ invoice, onSubmit, onCancel }: InvoiceFormProps) => {
  const form = useInvoiceForm({ invoice, onSubmit });

  return (
    <form onSubmit={form.handleSubmit} className="space-y-6">
      {/* General Information */}
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Select value={form.selectedClientId} onValueChange={form.setSelectedClientId}>
              <SelectTrigger id="client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {form.clients.map((client) => (
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
              value={form.date}
              onChange={(e) => form.setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input
              type="date"
              id="dueDate"
              required
              value={form.dueDate}
              onChange={(e) => form.setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency *</Label>
            <Select
              value={form.currency}
              onValueChange={(v) => form.setCurrency(v as typeof form.currency)}
            >
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
      <VATSection
        applyVAT={form.applyVAT}
        vatCountry={form.vatCountry}
        vatExemptionReason={form.vatExemptionReason}
        vatRates={form.settings.vatRates}
        onApplyVATChange={form.setApplyVAT}
        onVatCountryChange={form.setVatCountry}
        onVatExemptionReasonChange={form.setVatExemptionReason}
      />

      {/* Line Items */}
      <LineItemsEditor
        lineItems={form.lineItems}
        applyVAT={form.applyVAT}
        selectedVatRate={form.selectedVatRate}
        currencySymbol={form.currencySymbol}
        subtotal={form.subtotal}
        vat={form.vat}
        total={form.total}
        savedItemsCount={form.savedItems.length}
        activeAutocomplete={form.activeAutocomplete}
        autocompleteRef={form.autocompleteRef}
        getFilteredSavedItems={form.getFilteredSavedItems}
        onAddLineItem={form.addLineItem}
        onUpdateLineItem={form.updateLineItem}
        onRemoveLineItem={form.removeLineItem}
        onDescriptionChange={form.handleDescriptionChange}
        onFocusDescription={form.setActiveAutocomplete}
        onApplySavedItem={form.applySavedItem}
        onDeleteSavedItem={form.deleteSavedItem}
      />

      {/* Custom Fields */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Custom Fields</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={form.addCustomField}>
            <Plus className="mr-2 h-4 w-4" />
            Add Field
          </Button>
        </CardHeader>
        <CardContent>
          {form.customFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom fields. Click &ldquo;Add Field&rdquo; to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {form.customFields.map((field) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center"
                >
                  <div className="sm:col-span-5">
                    <Input
                      placeholder="Field name"
                      value={field.label}
                      onChange={(e) =>
                        form.updateCustomField(field.id, 'label', e.target.value)
                      }
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <Input
                      placeholder="Value"
                      value={field.value}
                      onChange={(e) =>
                        form.updateCustomField(field.id, 'value', e.target.value)
                      }
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => form.removeCustomField(field.id)}
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
              value={form.paymentTerms}
              onChange={(e) => form.setPaymentTerms(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => form.setNotes(e.target.value)}
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
              checked={form.splitEnabled}
              onCheckedChange={(checked) => {
                form.setSplitEnabled(checked === true);
                if (checked && form.splitAmount === 0) {
                  form.setSplitAmount(form.total / 2);
                }
              }}
            />
            <Label htmlFor="splitEnabled" className="text-lg font-semibold cursor-pointer">
              Split Invoice
            </Label>
          </div>
        </CardHeader>
        {form.splitEnabled && (
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-orange-600">
                Part B (orange): {form.currencySymbol}
                {form.splitAmount.toFixed(2)}
              </span>
              <span className="font-medium text-green-600">
                Part A (full invoice): {form.currencySymbol}
                {form.total.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={form.total}
              step="0.01"
              value={form.splitAmount}
              onChange={(e) => form.setSplitAmount(parseFloat(e.target.value))}
              className="w-full h-3 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #f97316 0%, #f97316 ${form.splitPercentage}%, #10b981 ${form.splitPercentage}%, #10b981 100%)`,
              }}
            />
            <p className="text-xs text-muted-foreground">
              Slide to adjust Part B amount. Part A will be the full original invoice, Part B
              will be an invoice with only the selected amount.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{invoice ? 'Update' : 'Create Invoice'}</Button>
      </div>
    </form>
  );
};
