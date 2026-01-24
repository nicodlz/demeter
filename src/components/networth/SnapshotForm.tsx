import { useState } from 'react';
import type { NetWorthSnapshotV2, AssetEntry, Currency, AnyNetWorthSnapshot } from '@/types';
import { isV2Snapshot } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { useExchangeRate } from '@/hooks/useExchangeRate';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AssetCategoryInput } from './AssetCategoryInput';

interface SnapshotFormProps {
  snapshot?: AnyNetWorthSnapshot;
  currency: Currency;
  onSubmit: (data: Omit<NetWorthSnapshotV2, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const convertV1ToV2Entries = (value: number, currency: Currency): AssetEntry[] => {
  if (value <= 0) return [];
  return [
    {
      id: crypto.randomUUID(),
      name: 'Legacy',
      amount: value,
      currency,
    },
  ];
};

export const SnapshotForm = ({
  snapshot,
  currency,
  onSubmit,
  onCancel,
}: SnapshotFormProps) => {
  const { convert, loading: rateLoading } = useExchangeRate();

  const getInitialEntries = (category: 'stocks' | 'crypto' | 'cash' | 'stablecoins'): AssetEntry[] => {
    if (!snapshot) return [];
    if (isV2Snapshot(snapshot)) {
      return snapshot[category];
    }
    return convertV1ToV2Entries(snapshot[category], currency);
  };

  const [date, setDate] = useState(
    snapshot?.date || new Date().toISOString().split('T')[0]
  );
  const [stocks, setStocks] = useState<AssetEntry[]>(getInitialEntries('stocks'));
  const [crypto, setCrypto] = useState<AssetEntry[]>(getInitialEntries('crypto'));
  const [cash, setCash] = useState<AssetEntry[]>(getInitialEntries('cash'));
  const [stablecoins, setStablecoins] = useState<AssetEntry[]>(getInitialEntries('stablecoins'));
  const [notes, setNotes] = useState(snapshot?.notes || '');

  const calculateCategoryTotal = (entries: AssetEntry[]): number => {
    return entries.reduce((sum, entry) => {
      return sum + convert(entry.amount, entry.currency, 'USD');
    }, 0);
  };

  const total =
    calculateCategoryTotal(stocks) +
    calculateCategoryTotal(crypto) +
    calculateCategoryTotal(cash) +
    calculateCategoryTotal(stablecoins);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      date,
      version: 2,
      stocks,
      crypto,
      cash,
      stablecoins,
      notes: notes || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{snapshot ? 'Edit Snapshot' : 'New Snapshot'}</CardTitle>
        <CardDescription>
          Record your net worth at a specific date
          {rateLoading && (
            <span className="ml-2 text-xs text-muted-foreground">
              (Loading exchange rate...)
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <AssetCategoryInput
              label="Stocks"
              entries={stocks}
              onChange={setStocks}
              convert={convert}
            />

            <AssetCategoryInput
              label="Crypto"
              entries={crypto}
              onChange={setCrypto}
              convert={convert}
            />

            <AssetCategoryInput
              label="Cash"
              entries={cash}
              onChange={setCash}
              convert={convert}
            />

            <AssetCategoryInput
              label="Stablecoins"
              entries={stablecoins}
              onChange={setStablecoins}
              convert={convert}
            />
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Total Net Worth
              </span>
              <span className="text-2xl font-bold">
                {formatCurrency(total, 'USD')}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this snapshot..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {snapshot ? 'Update' : 'Save'} Snapshot
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
