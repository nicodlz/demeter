import { useNetWorthSnapshots, getSnapshotTotal, getCategoryTotal } from './useNetWorthSnapshots';
import { useExchangeRate } from './useExchangeRate';
import type { AnyNetWorthSnapshot, AssetClass, Currency } from '@/schemas';
import type { AssetAllocation, NetWorthEvolution } from '../types';

const ASSET_COLORS: Record<AssetClass, string> = {
  stocks: '#3b82f6',
  crypto: '#f59e0b',
  cash: '#10b981',
  stablecoins: '#8b5cf6',
};

const ASSET_LABELS: Record<AssetClass, string> = {
  stocks: 'Stocks',
  crypto: 'Crypto',
  cash: 'Cash',
  stablecoins: 'Stablecoins',
};

export interface NetWorthStats {
  totalNetWorth: number;
  allocation: AssetAllocation[];
  evolution: NetWorthEvolution[];
  snapshotCount: number;
  latestSnapshot: AnyNetWorthSnapshot | null;
  changeFromPrevious: number | null;
  changePercentage: number | null;
}

const formatDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
};

export const useNetWorthDashboard = (targetCurrency: Currency = 'USD'): NetWorthStats => {
  const { snapshots, getLatestSnapshot } = useNetWorthSnapshots();
  const { convert } = useExchangeRate();

  const sortedSnapshots = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const latestSnapshot = getLatestSnapshot();
  const totalNetWorth = latestSnapshot
    ? getSnapshotTotal(latestSnapshot, convert, targetCurrency)
    : 0;

  // Calculate allocation from latest snapshot
  const assetClasses: AssetClass[] = ['stocks', 'crypto', 'cash', 'stablecoins'];
  const allocation: AssetAllocation[] = latestSnapshot
    ? assetClasses.map((assetClass) => {
        const value = getCategoryTotal(latestSnapshot, assetClass, convert, targetCurrency);
        return {
          assetClass,
          label: ASSET_LABELS[assetClass],
          value,
          percentage:
            totalNetWorth > 0
              ? (value / totalNetWorth) * 100
              : 0,
          color: ASSET_COLORS[assetClass],
        };
      })
    : [];

  // Calculate evolution data for chart
  const evolution: NetWorthEvolution[] = sortedSnapshots.map((snapshot) => ({
    date: snapshot.date,
    dateLabel: formatDateLabel(snapshot.date),
    total: getSnapshotTotal(snapshot, convert, targetCurrency),
    stocks: getCategoryTotal(snapshot, 'stocks', convert, targetCurrency),
    crypto: getCategoryTotal(snapshot, 'crypto', convert, targetCurrency),
    cash: getCategoryTotal(snapshot, 'cash', convert, targetCurrency),
    stablecoins: getCategoryTotal(snapshot, 'stablecoins', convert, targetCurrency),
  }));

  // Calculate change from previous snapshot (both in same currency)
  let changeFromPrevious: number | null = null;
  let changePercentage: number | null = null;

  if (sortedSnapshots.length >= 2) {
    const previousSnapshot = sortedSnapshots[sortedSnapshots.length - 2];
    const previousTotal = getSnapshotTotal(previousSnapshot, convert, targetCurrency);
    changeFromPrevious = totalNetWorth - previousTotal;
    changePercentage =
      previousTotal > 0
        ? ((totalNetWorth - previousTotal) / previousTotal) * 100
        : null;
  }

  return {
    totalNetWorth,
    allocation,
    evolution,
    snapshotCount: snapshots.length,
    latestSnapshot,
    changeFromPrevious,
    changePercentage,
  };
};
