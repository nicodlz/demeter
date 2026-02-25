import { useCallback, useMemo } from 'react';
import { useStore } from '../store';
import { fetchAllWalletsPositions } from '@/services/zerionApi';
import { fetchAllBitcoinPositions } from '@/services/bitcoinApi';
import type { TokenPosition } from '@/schemas';

export const useCrypto = () => {
  const wallets = useStore((s) => s.cryptoWallets);
  const positions = useStore((s) => s.cryptoPositions);
  const lastSyncAt = useStore((s) => s.cryptoLastSyncAt);
  const syncing = useStore((s) => s.cryptoSyncing);
  const zerionApiKey = useStore((s) => s.settings.zerionApiKey);

  const addWallet = useStore((s) => s.addCryptoWallet);
  const removeWallet = useStore((s) => s.removeCryptoWallet);
  const updateWallet = useStore((s) => s.updateCryptoWallet);
  const removePosition = useStore((s) => s.removeCryptoPosition);
  const setPositions = useStore((s) => s.setCryptoPositions);
  const setSyncing = useStore((s) => s.setCryptoSyncing);
  const setLastSyncAt = useStore((s) => s.setCryptoLastSyncAt);

  const syncAllWallets = useCallback(async (): Promise<{
    success: boolean;
    errors?: Array<{ walletId: string; address: string; error: string }>;
  }> => {
    if (wallets.length === 0) {
      return { success: false, errors: [{ walletId: '', address: '', error: 'No wallets configured.' }] };
    }

    setSyncing(true);
    try {
      // Separate wallets by type
      const evmWallets = wallets.filter((w) => w.type === 'evm' || !w.type);
      const btcWallets = wallets.filter((w) => w.type === 'bitcoin');

      const allPositions: TokenPosition[] = [];
      const allErrors: Array<{ walletId: string; address: string; error: string }> = [];

      // Sync EVM wallets with Zerion (only if API key is configured)
      if (evmWallets.length > 0) {
        if (!zerionApiKey) {
          allErrors.push({ walletId: '', address: '', error: 'Zerion API key not configured for EVM wallets. Go to Settings.' });
        } else {
          const evmResult = await fetchAllWalletsPositions(evmWallets, zerionApiKey);
          allPositions.push(...evmResult.positions);
          allErrors.push(...evmResult.errors);
        }
      }

      // Sync Bitcoin wallets
      if (btcWallets.length > 0) {
        const btcResult = await fetchAllBitcoinPositions(btcWallets);
        allPositions.push(...btcResult.positions);
        allErrors.push(...btcResult.errors);
      }

      setPositions(allPositions);
      setLastSyncAt(new Date().toISOString());
      return { success: allErrors.length === 0, errors: allErrors.length > 0 ? allErrors : undefined };
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
    removePosition,
    syncAllWallets,
    getTotalCryptoValue,
    getTotalStablecoinValue,
    getPositionsByWallet,
    getPositionsByChain,
    chains,
  };
};
