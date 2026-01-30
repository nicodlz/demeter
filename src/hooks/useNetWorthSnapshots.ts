import { useState, useEffect, useCallback } from 'react';
import type { NetWorthSnapshotV2, AnyNetWorthSnapshot, Currency } from '../types';
import { isV2Snapshot } from '../types';
import { netWorthSnapshotV2Schema, anyNetWorthSnapshotSchema } from '../schemas';
import { z } from 'zod';
import { storage, STORAGE_KEYS } from '../utils/storage';

// Helper to calculate total for any snapshot format
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

// Helper to get category total for any snapshot format
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

export const useNetWorthSnapshots = () => {
  const [snapshots, setSnapshots] = useState<AnyNetWorthSnapshot[]>(() =>
    storage.get<AnyNetWorthSnapshot[]>(STORAGE_KEYS.NET_WORTH_SNAPSHOTS, [])
  );

  useEffect(() => {
    storage.set(STORAGE_KEYS.NET_WORTH_SNAPSHOTS, snapshots);
  }, [snapshots]);

  const addSnapshot = (
    snapshotData: Omit<NetWorthSnapshotV2, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const newSnapshot = {
      ...snapshotData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = netWorthSnapshotV2Schema.safeParse(newSnapshot);
    if (!result.success) {
      console.error('[Demeter] Invalid snapshot data:', result.error.issues);
      return newSnapshot as NetWorthSnapshotV2;
    }
    setSnapshots((prev) => [...prev, result.data]);
    return result.data;
  };

  const updateSnapshot = (id: string, snapshotData: Omit<NetWorthSnapshotV2, 'id' | 'createdAt' | 'updatedAt'>) => {
    setSnapshots((prev) =>
      prev.map((snapshot): AnyNetWorthSnapshot => {
        if (snapshot.id !== id) return snapshot;
        // When updating, always convert to V2 format
        const updatedSnapshot = {
          id: snapshot.id,
          createdAt: snapshot.createdAt,
          updatedAt: new Date().toISOString(),
          date: snapshotData.date,
          version: 2 as const,
          stocks: snapshotData.stocks,
          crypto: snapshotData.crypto,
          cash: snapshotData.cash,
          stablecoins: snapshotData.stablecoins,
          notes: snapshotData.notes,
        };
        const result = netWorthSnapshotV2Schema.safeParse(updatedSnapshot);
        if (!result.success) {
          console.error('[Demeter] Invalid snapshot update:', result.error.issues);
          return snapshot;
        }
        return result.data;
      })
    );
  };

  const deleteSnapshot = (id: string) => {
    setSnapshots((prev) => prev.filter((snapshot) => snapshot.id !== id));
  };

  const getSnapshotById = (id: string) => {
    return snapshots.find((snapshot) => snapshot.id === id);
  };

  const getSnapshotByDate = (date: string) => {
    return snapshots.find((snapshot) => snapshot.date === date);
  };

  const getLatestSnapshot = useCallback((): AnyNetWorthSnapshot | null => {
    if (snapshots.length === 0) return null;
    return [...snapshots].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  }, [snapshots]);

  const getSortedSnapshots = () => {
    return [...snapshots].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const exportAsJSON = () => {
    const dataStr = JSON.stringify(snapshots, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `net-worth-snapshots-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFromJSON = (jsonString: string): boolean => {
    try {
      const parsed: unknown = JSON.parse(jsonString);
      const result = z.array(anyNetWorthSnapshotSchema).safeParse(parsed);
      if (!result.success) {
        console.error('[Demeter] Invalid snapshot import data:', result.error.issues);
        return false;
      }
      setSnapshots(result.data);
      return true;
    } catch {
      return false;
    }
  };

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
