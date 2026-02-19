import { useState } from 'react';
import type { NetWorthSnapshotV2, AssetEntry, Currency, AnyNetWorthSnapshot } from '@/schemas';
import { isV2Snapshot } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCrypto } from '@/hooks/useCrypto';
import { useIbkr } from '@/hooks/useIbkr';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AssetCategoryInput } from './AssetCategoryInput';
import { Sparkles } from 'lucide-react';

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
  const { getTotalCryptoValue, getTotalStablecoinValue, lastSyncAt, positions } = useCrypto();
  const {
    positions: ibkrPositions,
    totalPositionValue: ibkrTotalValue,
    totalCashValue: ibkrCashValue,
    lastSyncAt: ibkrLastSyncAt,
  } = useIbkr();

  const hasCryptoData = positions.length > 0 && lastSyncAt !== null;
  const hasIbkrData = ibkrPositions.length > 0 && ibkrLastSyncAt !== null;
  const hasAnySource = hasCryptoData || hasIbkrData;

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
  const [cryptoEntries, setCryptoEntries] = useState<AssetEntry[]>(getInitialEntries('crypto'));
  const [cash, setCash] = useState<AssetEntry[]>(getInitialEntries('cash'));
  const [stablecoins, setStablecoins] = useState<AssetEntry[]>(getInitialEntries('stablecoins'));
  const [notes, setNotes] = useState(snapshot?.notes || '');

  const handleAutoFillAll = () => {
    // Fill crypto & stablecoins from Zerion wallets
    if (hasCryptoData) {
      const cryptoValue = getTotalCryptoValue;
      const stablecoinValue = getTotalStablecoinValue;

      setCryptoEntries([
        {
          id: globalThis.crypto.randomUUID(),
          name: 'Wallets (auto-synced)',
          amount: cryptoValue,
          currency: 'USD' as Currency,
        },
      ]);
      setStablecoins([
        {
          id: globalThis.crypto.randomUUID(),
          name: 'Wallets (auto-synced)',
          amount: stablecoinValue,
          currency: 'USD' as Currency,
        },
      ]);
    }

    // Fill stocks & cash from IBKR
    if (hasIbkrData) {
      setStocks([
        {
          id: globalThis.crypto.randomUUID(),
          name: 'IBKR Positions (auto-synced)',
          amount: ibkrTotalValue,
          currency: 'USD' as Currency,
        },
      ]);
      setCash([
        {
          id: globalThis.crypto.randomUUID(),
          name: 'IBKR Cash (auto-synced)',
          amount: ibkrCashValue,
          currency: 'USD' as Currency,
        },
      ]);
    }
  };

  const calculateCategoryTotal = (entries: AssetEntry[]): number => {
    return entries.reduce((sum, entry) => {
      return sum + convert(entry.amount, entry.currency, 'USD');
    }, 0);
  };

  const total =
    calculateCategoryTotal(stocks) +
    calculateCategoryTotal(cryptoEntries) +
    calculateCategoryTotal(cash) +
    calculateCategoryTotal(stablecoins);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      date,
      version: 2,
      stocks,
      crypto: cryptoEntries,
      cash,
      stablecoins,
      notes: notes || undefined,
    });
  };

  const sourceLabels: string[] = [];
  if (hasCryptoData) sourceLabels.push('Zerion');
  if (hasIbkrData) sourceLabels.push('IBKR');

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

          {hasAnySource && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
              <div className="text-sm">
                <span className="font-medium">Auto-fill from all sources</span>
                <span className="text-muted-foreground ml-2">
                  {sourceLabels.join(' + ')}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoFillAll}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Auto-fill all
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <AssetCategoryInput
              label="Stocks"
              entries={stocks}
              onChange={setStocks}
              convert={convert}
            />

            <AssetCategoryInput
              label="Crypto"
              entries={cryptoEntries}
              onChange={setCryptoEntries}
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
