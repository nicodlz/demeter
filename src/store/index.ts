/**
 * Zustand store for Demeter
 *
 * Composed of independent slices (SRP).
 * Storage: multiKeyStorage (localStorage, offline-first).
 * Vault sync is a side-effect layer on top — see lib/vault/sync.ts.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { StoreState, PersistedState } from './types';
import { multiKeyStorage } from './storage';
import { createSettingsSlice } from './slices/settingsSlice';
import { createClientsSlice } from './slices/clientsSlice';
import { createInvoicesSlice } from './slices/invoicesSlice';
import { createSavedItemsSlice } from './slices/savedItemsSlice';
import { createNetWorthSlice } from './slices/netWorthSlice';
import { createExpensesSlice } from './slices/expensesSlice';
import { createCategoryMappingsSlice } from './slices/categoryMappingsSlice';
import { createCryptoSlice } from './slices/cryptoSlice';
import { createIbkrSlice } from './slices/ibkrSlice';

// =============================================================================
// Shared partialize (DRY — used by store persist + vault sync)
// =============================================================================

export const partialize = (state: StoreState): PersistedState => ({
  settings: state.settings,
  clients: state.clients,
  invoices: state.invoices,
  savedItems: state.savedItems,
  snapshots: state.snapshots,
  expenses: state.expenses,
  mappings: state.mappings,
  cryptoWallets: state.cryptoWallets,
  cryptoPositions: state.cryptoPositions,
  cryptoLastSyncAt: state.cryptoLastSyncAt,
  ibkrPositions: state.ibkrPositions,
  ibkrCashBalances: state.ibkrCashBalances,
  ibkrLastSyncAt: state.ibkrLastSyncAt,
  ibkrAccountId: state.ibkrAccountId,
  ibkrNav: state.ibkrNav,
});

// =============================================================================
// Store singleton
// =============================================================================

export const useStore = create<StoreState>()(
  persist(
    (...a) => ({
      ...createSettingsSlice(...a),
      ...createClientsSlice(...a),
      ...createInvoicesSlice(...a),
      ...createSavedItemsSlice(...a),
      ...createNetWorthSlice(...a),
      ...createExpensesSlice(...a),
      ...createCategoryMappingsSlice(...a),
      ...createCryptoSlice(...a),
      ...createIbkrSlice(...a),
    }),
    {
      name: 'demeter-store',
      storage: multiKeyStorage,
      onRehydrateStorage: () => (state) => {
        // Migration: fix negative expense amounts (sign is tracked via type field)
        if (state?.expenses) {
          let fixed = 0;
          for (const e of state.expenses) {
            if (e.amount < 0) {
              e.amount = Math.abs(e.amount);
              fixed++;
            }
          }
          if (fixed > 0) console.log(`[demeter] Fixed ${fixed} negative expense amounts`);
        }
      },
      partialize,
    })
);

// Re-export
export type { StoreState, PersistedState } from './types';
