import { useState } from 'react';
import type { ParsedTransaction } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ImportPreviewProps {
  transactions: ParsedTransaction[];
  duplicates: ParsedTransaction[];
  onConfirm: (selected: ParsedTransaction[]) => void;
  onCancel: () => void;
}

export const ImportPreview = ({
  transactions,
  duplicates,
  onConfirm,
  onCancel,
}: ImportPreviewProps) => {
  // All non-duplicate transactions selected by default
  const [selected, setSelected] = useState<Set<number>>(
    new Set(transactions.map((_, i) => i))
  );

  const toggleTransaction = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === transactions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transactions.map((_, i) => i)));
    }
  };

  const handleConfirm = () => {
    const selectedTransactions = transactions.filter((_, i) => selected.has(i));
    onConfirm(selectedTransactions);
  };

  const totalSelected = transactions
    .filter((_, i) => selected.has(i))
    .reduce((sum, t) => sum + t.amount, 0);

  const previewCurrency = transactions[0]?.currency ?? 'USD';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-medium">Preview Import</h3>
          <p className="text-sm text-muted-foreground">
            {selected.size} of {transactions.length} transactions selected
            {duplicates.length > 0 && (
              <span className="ml-2 text-orange-600">
                ({duplicates.length} duplicates excluded)
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Total selected</div>
          <div className="font-bold text-destructive">
            -{formatCurrency(totalSelected, previewCurrency)}
          </div>
        </div>
      </div>

      {duplicates.length > 0 && (
        <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
          <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
            Duplicates Found ({duplicates.length})
          </h4>
          <div className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
            {duplicates.slice(0, 5).map((d, i) => (
              <div key={i} className="line-through opacity-60">
                {formatDate(d.date)} - {d.description.substring(0, 40)}... - {formatCurrency(d.amount, d.currency)}
              </div>
            ))}
            {duplicates.length > 5 && (
              <div className="text-xs">...and {duplicates.length - 5} more</div>
            )}
          </div>
        </div>
      )}

      <div className="border rounded-lg max-h-[400px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={selected.size === transactions.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx, index) => (
              <TableRow
                key={index}
                className={!selected.has(index) ? 'opacity-50' : ''}
              >
                <TableCell>
                  <Checkbox
                    checked={selected.has(index)}
                    onCheckedChange={() => toggleTransaction(index)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {formatDate(tx.date)}
                </TableCell>
                <TableCell>
                  <div className="max-w-[150px] sm:max-w-[250px] truncate" title={tx.description}>
                    {tx.description}
                  </div>
                  {tx.merchantName && tx.merchantName !== tx.description && (
                    <div className="text-xs text-muted-foreground">
                      {tx.merchantName}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium text-destructive">
                  -{formatCurrency(tx.amount, tx.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={selected.size === 0}>
          Import {selected.size} Transactions
        </Button>
      </div>
    </div>
  );
};
