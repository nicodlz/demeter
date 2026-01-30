import { useCallback, useMemo } from 'react';
import { useStore } from '../store';
import { fetchIbkrPortfolio } from '@/services/ibkrApi';

export const useIbkr = () => {
  const positions = useStore((s) => s.ibkrPositions);
  const cashBalances = useStore((s) => s.ibkrCashBalances);
  const lastSyncAt = useStore((s) => s.ibkrLastSyncAt);
  const syncing = useStore((s) => s.ibkrSyncing);
  const accountId = useStore((s) => s.ibkrAccountId);
  const nav = useStore((s) => s.ibkrNav);
  const flexToken = useStore((s) => s.settings.ibkrFlexToken);
  const flexQueryId = useStore((s) => s.settings.ibkrFlexQueryId);

  const setPositions = useStore((s) => s.setIbkrPositions);
  const setCashBalances = useStore((s) => s.setIbkrCashBalances);
  const setSyncing = useStore((s) => s.setIbkrSyncing);
  const setLastSyncAt = useStore((s) => s.setIbkrLastSyncAt);
  const setAccountId = useStore((s) => s.setIbkrAccountId);
  const setNav = useStore((s) => s.setIbkrNav);

  const isConfigured = Boolean(flexToken && flexQueryId);

  const syncIbkr = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!flexToken || !flexQueryId) {
      return {
        success: false,
        error: 'IBKR Flex token and Query ID not configured. Go to Data page.',
      };
    }

    setSyncing(true);
    try {
      const account = await fetchIbkrPortfolio(flexToken, flexQueryId);
      setPositions(account.positions);
      setCashBalances(account.cashBalances);
      setAccountId(account.accountId);
      setNav(account.nav);
      setLastSyncAt(new Date().toISOString());
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    } finally {
      setSyncing(false);
    }
  }, [
    flexToken,
    flexQueryId,
    setSyncing,
    setPositions,
    setCashBalances,
    setAccountId,
    setNav,
    setLastSyncAt,
  ]);

  const totalPositionValue = useMemo(() => {
    return positions.reduce((sum, p) => sum + p.marketValue, 0);
  }, [positions]);

  const totalCashValue = useMemo(() => {
    return cashBalances.reduce((sum, cb) => sum + cb.endingCash, 0);
  }, [cashBalances]);

  const totalUnrealizedPnl = useMemo(() => {
    return positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  }, [positions]);

  const totalCostBasis = useMemo(() => {
    return positions.reduce((sum, p) => sum + p.costBasisMoney, 0);
  }, [positions]);

  const assetCategories = useMemo(() => {
    const set = new Set(positions.map((p) => p.assetCategory));
    return Array.from(set).sort();
  }, [positions]);

  const currencies = useMemo(() => {
    const set = new Set(positions.map((p) => p.currency));
    return Array.from(set).sort();
  }, [positions]);

  const getPositionsByCategory = useCallback(
    (category: string) => positions.filter((p) => p.assetCategory === category),
    [positions],
  );

  const getPositionsByCurrency = useCallback(
    (currency: string) => positions.filter((p) => p.currency === currency),
    [positions],
  );

  return {
    positions,
    cashBalances,
    lastSyncAt,
    syncing,
    accountId,
    nav,
    isConfigured,
    syncIbkr,
    totalPositionValue,
    totalCashValue,
    totalUnrealizedPnl,
    totalCostBasis,
    assetCategories,
    currencies,
    getPositionsByCategory,
    getPositionsByCurrency,
  };
};
