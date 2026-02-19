import { useState, useMemo } from 'react';
import { useIbkr } from '@/hooks/useIbkr';

export function useIbkrPage() {
  const ibkr = useIbkr();
  const {
    positions,
    totalUnrealizedPnl,
    totalCostBasis,
    syncIbkr,
  } = ibkr;

  const [syncError, setSyncError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');

  const handleSync = async () => {
    setSyncError(null);
    const result = await syncIbkr();
    if (!result.success && result.error) {
      setSyncError(result.error);
    }
  };

  const filteredPositions = useMemo(() => {
    return positions.filter((p) => {
      if (filterCategory !== 'all' && p.assetCategory !== filterCategory) return false;
      if (filterCurrency !== 'all' && p.currency !== filterCurrency) return false;
      return true;
    });
  }, [positions, filterCategory, filterCurrency]);

  const sortedPositions = useMemo(() => {
    return [...filteredPositions].sort((a, b) => Math.abs(b.marketValue) - Math.abs(a.marketValue));
  }, [filteredPositions]);

  const totalPnlPercent =
    totalCostBasis > 0 ? (totalUnrealizedPnl / totalCostBasis) * 100 : 0;

  return {
    // Re-export everything from useIbkr
    ...ibkr,
    // Additional state
    syncError,
    filterCategory,
    setFilterCategory,
    filterCurrency,
    setFilterCurrency,
    // Derived
    filteredPositions,
    sortedPositions,
    totalPnlPercent,
    // Handlers
    handleSync,
  };
}
