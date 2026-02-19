import { useCallback } from 'react';
import { useStore } from '../store';
import type { AnyNetWorthSnapshot, Currency } from '../schemas';
import { isV2Snapshot } from '../types';

// =============================================================================
// Standalone utility functions (not hook-dependent, exported for reuse)
// =============================================================================

/** Calculate total net worth for any snapshot format */
export const getSnapshotTotal = (
  snapshot: AnyNetWorthSnapshot,
  convert: (amount: number, from: Currency, to: Currency) => number,
  targetCurrency: Currency = 'USD'
): number => {
  if (isV2Snapshot(snapshot)) {
    const categories = ['stocks', 'crypto', 'cash', 'stablecoins'] as const;
    return categories.reduce((total, category) => {
      return total + snapshot[category].reduce((sum, entry) => {
        return sum + convert(entry.amount, entry.currency, targetCurrency);
      }, 0);
    }, 0);
  }
  // V1: assume USD and convert to target currency
  const total = snapshot.stocks + snapshot.crypto + snapshot.cash + snapshot.stablecoins;
  return convert(total, 'USD', targetCurrency);
};

/** Get category total for any snapshot format */
export const getCategoryTotal = (
  snapshot: AnyNetWorthSnapshot,
  category: 'stocks' | 'crypto' | 'cash' | 'stablecoins',
  convert: (amount: number, from: Currency, to: Currency) => number,
  targetCurrency: Currency = 'USD'
): number => {
  if (isV2Snapshot(snapshot)) {
    return snapshot[category].reduce((sum, entry) => {
      return sum + convert(entry.amount, entry.currency, targetCurrency);
    }, 0);
  }
  // V1: assume USD and convert to target currency
  return convert(snapshot[category], 'USD', targetCurrency);
};

// =============================================================================
// Hook
// =============================================================================

export const useNetWorthSnapshots = () => {
  const snapshots = useStore((state) => state.snapshots);
  const addSnapshot = useStore((state) => state.addSnapshot);
  const updateSnapshot = useStore((state) => state.updateSnapshot);
  const deleteSnapshot = useStore((state) => state.deleteSnapshot);
  const importFromJSON = useStore((state) => state.importFromJSON);

  const getSnapshotById = useCallback(
    (id: string) => snapshots.find((snapshot) => snapshot.id === id),
    [snapshots]
  );

  const getSnapshotByDate = useCallback(
    (date: string) => snapshots.find((snapshot) => snapshot.date === date),
    [snapshots]
  );

  const getLatestSnapshot = useCallback((): AnyNetWorthSnapshot | null => {
    if (snapshots.length === 0) return null;
    return [...snapshots].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  }, [snapshots]);

  const getSortedSnapshots = useCallback(() => {
    return [...snapshots].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [snapshots]);

  const exportAsJSON = useCallback(() => {
    const dataStr = JSON.stringify(snapshots, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `net-worth-snapshots-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [snapshots]);

  return {
    snapshots,
    addSnapshot,
    updateSnapshot,
    deleteSnapshot,
    getSnapshotById,
    getSnapshotByDate,
    getLatestSnapshot,
    getSortedSnapshots,
    exportAsJSON,
    importFromJSON,
  };
};
