import { generateId } from '../../utils/id';
import type { StateCreator } from 'zustand';
import type { CryptoWallet, TokenPosition } from '@/schemas';
import type { StoreState, CryptoSlice } from '../types';

export const createCryptoSlice: StateCreator<
  StoreState,
  [],
  [],
  CryptoSlice
> = (set) => ({
  cryptoWallets: [],
  cryptoPositions: [],
  cryptoLastSyncAt: null,
  cryptoSyncing: false,

  addCryptoWallet: (wallet) => {
    const newWallet: CryptoWallet = {
      id: generateId(),
      label: wallet.label,
      address: wallet.address,
      type: wallet.type || 'evm', // Default to EVM for backward compatibility
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      cryptoWallets: [...state.cryptoWallets, newWallet],
    }));
    return newWallet;
  },

  removeCryptoWallet: (id) => {
    set((state) => ({
      cryptoWallets: state.cryptoWallets.filter((w) => w.id !== id),
      cryptoPositions: state.cryptoPositions.filter((p) => p.walletId !== id),
    }));
  },

  updateCryptoWallet: (id, data) => {
    set((state) => ({
      cryptoWallets: state.cryptoWallets.map((w) =>
        w.id === id ? { ...w, ...data } : w,
      ),
    }));
  },

  removeCryptoPosition: (id) => {
    set((state) => ({
      cryptoPositions: state.cryptoPositions.filter((p) => p.id !== id),
    }));
  },

  setCryptoPositions: (positions: TokenPosition[]) => {
    set({ cryptoPositions: positions });
  },

  setCryptoSyncing: (syncing: boolean) => {
    set({ cryptoSyncing: syncing });
  },

  setCryptoLastSyncAt: (date: string | null) => {
    set({ cryptoLastSyncAt: date });
  },
});
