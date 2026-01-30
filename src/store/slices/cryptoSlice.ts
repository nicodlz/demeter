import type { StateCreator } from 'zustand';
import type { CryptoWallet, TokenPosition } from '../../types';
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
      ...wallet,
      id: crypto.randomUUID(),
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
