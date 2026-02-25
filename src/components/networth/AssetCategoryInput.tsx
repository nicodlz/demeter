import { generateId } from '@/utils/id';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { AssetEntry, Currency } from '@/schemas';
import { formatCurrency } from '@/utils/formatters';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AssetCategoryInputProps {
  label: string;
  entries: AssetEntry[];
  onChange: (entries: AssetEntry[]) => void;
  convert: (amount: number, from: Currency, to: Currency) => number;
}

export const AssetCategoryInput = ({
  label,
  entries,
  onChange,
  convert,
}: AssetCategoryInputProps) => {
  const { mask } = usePrivacyMode();
  const [isExpanded, setIsExpanded] = useState(entries.length > 0);

  const addEntry = () => {
    const newEntry: AssetEntry = {
      id: generateId(),
      name: '',
      amount: 0,
      currency: 'USD',
    };
    onChange([...entries, newEntry]);
    setIsExpanded(true);
  };

  const updateEntry = (id: string, updates: Partial<AssetEntry>) => {
    onChange(
      entries.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry
      )
    );
  };

  const removeEntry = (id: string) => {
    onChange(entries.filter((entry) => entry.id !== id));
  };

  const totalUSD = entries.reduce((sum, entry) => {
    return sum + convert(entry.amount, entry.currency, 'USD');
  }, 0);

  return (
    <div className="border rounded-lg">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{label}</span>
          {entries.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({entries.length})
            </span>
          )}
        </div>
        <span className="font-semibold">{mask(formatCurrency(totalUSD, 'USD'))}</span>
      </button>

      {isExpanded && (
        <div className="p-3 pt-0 space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Name (ex: ibkr)"
                value={entry.name}
                onChange={(e) => updateEntry(entry.id, { name: e.target.value })}
                className="flex-1 min-w-0"
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={entry.amount || ''}
                onChange={(e) =>
                  updateEntry(entry.id, {
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-28"
              />
              <Select
                value={entry.currency}
                onValueChange={(value: Currency) =>
                  updateEntry(entry.id, { currency: value })
                }
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeEntry(entry.id)}
                className="shrink-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEntry}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
};
