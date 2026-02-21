/**
 * Zustand store for Demeter
 *
 * Composed of independent slices (SRP). The storage adapter is swappable:
 * - Default: multiKeyStorage (localStorage, offline-first)
 * - After vault auth: createDemeterStore(vaultStorage) wraps localStorage + E2EE vault
 *
 * Components always use `useStore` — the active instance is managed by StoreProvider.
 */

import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersistStorage } from 'zustand/middleware';

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
// Shared partialize (DRY — used by both store factory and export)
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
// Slice composer (DRY)
// =============================================================================

type SliceCreatorArgs = Parameters<Parameters<typeof create<StoreState>>[0]>;

const createSlices = (...a: SliceCreatorArgs): StoreState => ({
  ...createSettingsSlice(...a),
  ...createClientsSlice(...a),
  ...createInvoicesSlice(...a),
  ...createSavedItemsSlice(...a),
  ...createNetWorthSlice(...a),
  ...createExpensesSlice(...a),
  ...createCategoryMappingsSlice(...a),
  ...createCryptoSlice(...a),
  ...createIbkrSlice(...a),
});

// =============================================================================
// Migration
// =============================================================================

const onRehydrate = () => (state: StoreState | undefined) => {
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
};

// =============================================================================
// Store factory
// =============================================================================

export function createDemeterStore(
  storage: PersistStorage<PersistedState> = multiKeyStorage,
): UseBoundStore<StoreApi<StoreState>> {
  return create<StoreState>()(
    persist(createSlices, {
      name: 'demeter-store',
      storage,
      onRehydrateStorage: onRehydrate,
      partialize,
    })
  );
}

// =============================================================================
// Default singleton (localStorage) — backward compatible for all existing code
// =============================================================================

export const useStore = createDemeterStore();

// Re-export
export type { StoreState, PersistedState } from './types';
