import type { StateCreator } from 'zustand';
import type { IbkrPosition, IbkrCashBalance } from '../../schemas/ibkr';
import type { StoreState, IbkrSlice } from '../types';

export const createIbkrSlice: StateCreator<
  StoreState,
  [],
  [],
  IbkrSlice
> = (set) => ({
  ibkrPositions: [],
  ibkrCashBalances: [],
  ibkrLastSyncAt: null,
  ibkrSyncing: false,
  ibkrAccountId: null,
  ibkrNav: null,

  setIbkrPositions: (positions: IbkrPosition[]) => {
    set({ ibkrPositions: positions });
  },

  setIbkrCashBalances: (balances: IbkrCashBalance[]) => {
    set({ ibkrCashBalances: balances });
  },

  setIbkrSyncing: (syncing: boolean) => {
    set({ ibkrSyncing: syncing });
  },

  setIbkrLastSyncAt: (date: string | null) => {
    set({ ibkrLastSyncAt: date });
  },

  setIbkrAccountId: (id: string | null) => {
    set({ ibkrAccountId: id });
  },

  setIbkrNav: (nav: number | null) => {
    set({ ibkrNav: nav });
  },
});
