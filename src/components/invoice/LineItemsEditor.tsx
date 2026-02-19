import type { LineItem, SavedItem, VATRate } from '@/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, X } from 'lucide-react';
import { SavedItemAutocomplete } from './SavedItemAutocomplete';

interface LineItemsEditorProps {
  lineItems: LineItem[];
  applyVAT: boolean;
  selectedVatRate: VATRate | undefined;
  currencySymbol: string;
  subtotal: number;
  vat: number;
  total: number;
  savedItemsCount: number;
  activeAutocomplete: string | null;
  autocompleteRef: React.RefObject<HTMLDivElement>;
  getFilteredSavedItems: (itemId: string) => SavedItem[];
  onAddLineItem: () => void;
  onUpdateLineItem: <K extends keyof LineItem>(id: string, field: K, value: LineItem[K]) => void;
  onRemoveLineItem: (id: string) => void;
  onDescriptionChange: (lineItemId: string, value: string) => void;
  onFocusDescription: (lineItemId: string) => void;
  onApplySavedItem: (lineItemId: string, savedItem: SavedItem) => void;
  onDeleteSavedItem: (savedItemId: string) => void;
}

export const LineItemsEditor = ({
  lineItems,
  applyVAT,
  selectedVatRate,
  currencySymbol,
  subtotal,
  vat,
  total,
  savedItemsCount,
  activeAutocomplete,
  autocompleteRef,
  getFilteredSavedItems,
  onAddLineItem,
  onUpdateLineItem,
  onRemoveLineItem,
  onDescriptionChange,
  onFocusDescription,
  onApplySavedItem,
  onDeleteSavedItem,
}: LineItemsEditorProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Invoice Lines</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={onAddLineItem}>
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
            {/* Description + Autocomplete */}
            <div
              className={
                applyVAT
                  ? 'col-span-2 sm:col-span-6 lg:col-span-3'
                  : 'col-span-2 sm:col-span-6 lg:col-span-4'
              }
            >
              <SavedItemAutocomplete
                lineItemId={item.id}
                description={item.description}
                isActive={activeAutocomplete === item.id}
                filteredItems={getFilteredSavedItems(item.id)}
                savedItemsCount={savedItemsCount}
                currencySymbol={currencySymbol}
                autocompleteRef={activeAutocomplete === item.id ? autocompleteRef : null}
                onDescriptionChange={onDescriptionChange}
                onFocus={onFocusDescription}
                onApply={onApplySavedItem}
                onDelete={onDeleteSavedItem}
              />
            </div>

            {/* Quantity */}
            <div className="col-span-1 sm:col-span-1 lg:col-span-1">
              <Label className="text-xs">Qty *</Label>
              <Input
                type="number"
                required
                min="0"
                step="0.01"
                value={item.quantity}
                onChange={(e) =>
                  onUpdateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                }
                className="mt-1"
              />
            </div>

            {/* Unit */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
              <Label className="text-xs">Unit *</Label>
              <Select
                value={item.unit}
                onValueChange={(v) => onUpdateLineItem(item.id, 'unit', v)}
              >
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

            {/* Type */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
              <Label className="text-xs">Type *</Label>
              <Select
                value={item.type}
                onValueChange={(v) =>
                  onUpdateLineItem(item.id, 'type', v as LineItem['type'])
                }
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

            {/* Unit Price */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
              <Label className="text-xs">Price *</Label>
              <Input
                type="number"
                required
                min="0"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) =>
                  onUpdateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                }
                className="mt-1"
              />
            </div>

            {/* VAT Rate (only when VAT is enabled) */}
            {applyVAT && (
              <div className="col-span-1 sm:col-span-1 lg:col-span-1">
                <Label className="text-xs">VAT%</Label>
                <Select
                  value={item.vatRate.toString()}
                  onValueChange={(v) =>
                    onUpdateLineItem(item.id, 'vatRate', parseFloat(v))
                  }
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

            {/* Remove button */}
            <div className="col-span-1 sm:col-span-1 lg:col-span-1 flex justify-end items-end">
              {lineItems.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveLineItem(item.id)}
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
            <span className="font-medium">
              {currencySymbol}
              {subtotal.toFixed(2)}
            </span>
          </div>
          {applyVAT && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT:</span>
              <span className="font-medium">
                {currencySymbol}
                {vat.toFixed(2)}
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>
              {currencySymbol}
              {total.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
