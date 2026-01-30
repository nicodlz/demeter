import { useCallback, useMemo } from 'react';
import { useStore } from '../store';
import { fetchAllWalletsPositions } from '@/services/zerionApi';

export const useCrypto = () => {
  const wallets = useStore((s) => s.cryptoWallets);
  const positions = useStore((s) => s.cryptoPositions);
  const lastSyncAt = useStore((s) => s.cryptoLastSyncAt);
  const syncing = useStore((s) => s.cryptoSyncing);
  const zerionApiKey = useStore((s) => s.settings.zerionApiKey);

  const addWallet = useStore((s) => s.addCryptoWallet);
  const removeWallet = useStore((s) => s.removeCryptoWallet);
  const updateWallet = useStore((s) => s.updateCryptoWallet);
  const setPositions = useStore((s) => s.setCryptoPositions);
  const setSyncing = useStore((s) => s.setCryptoSyncing);
  const setLastSyncAt = useStore((s) => s.setCryptoLastSyncAt);

  const syncAllWallets = useCallback(async (): Promise<{
    success: boolean;
    errors?: Array<{ walletId: string; address: string; error: string }>;
  }> => {
    if (!zerionApiKey) {
      return { success: false, errors: [{ walletId: '', address: '', error: 'Zerion API key not configured. Go to Settings.' }] };
    }
    if (wallets.length === 0) {
      return { success: false, errors: [{ walletId: '', address: '', error: 'No wallets configured.' }] };
    }

    setSyncing(true);
    try {
      const result = await fetchAllWalletsPositions(wallets, zerionApiKey);
      setPositions(result.positions);
      setLastSyncAt(new Date().toISOString());
      return { success: result.errors.length === 0, errors: result.errors.length > 0 ? result.errors : undefined };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, errors: [{ walletId: '', address: '', error: message }] };
    } finally {
      setSyncing(false);
    }
  }, [zerionApiKey, wallets, setSyncing, setPositions, setLastSyncAt]);

  const getTotalCryptoValue = useMemo(() => {
    return positions
      .filter((p) => !p.isStablecoin)
      .reduce((sum, p) => sum + p.usdValue, 0);
  }, [positions]);

  const getTotalStablecoinValue = useMemo(() => {
    return positions
      .filter((p) => p.isStablecoin)
      .reduce((sum, p) => sum + p.usdValue, 0);
  }, [positions]);

  const getPositionsByWallet = useCallback(
    (walletId: string) => positions.filter((p) => p.walletId === walletId),
    [positions],
  );

  const getPositionsByChain = useCallback(
    (chain: string) => positions.filter((p) => p.chain === chain),
    [positions],
  );

  const chains = useMemo(() => {
    const set = new Set(positions.map((p) => p.chain));
    return Array.from(set).sort();
  }, [positions]);

  return {
    wallets,
    positions,
    lastSyncAt,
    syncing,
    zerionApiKey,
    addWallet,
    removeWallet,
    updateWallet,
    syncAllWallets,
    getTotalCryptoValue,
    getTotalStablecoinValue,
    getPositionsByWallet,
    getPositionsByChain,
    chains,
  };
};
