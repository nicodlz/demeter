import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersistStorage, StorageValue } from 'zustand/middleware';

import { STORAGE_KEYS } from '../utils/storage';
import { DEFAULT_SETTINGS } from '../utils/constants';

import type { StoreState, PersistedState } from './types';
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
// Custom multi-key localStorage storage adapter
// Maps each slice's data to its own localStorage key for backward compatibility
// with the existing STORAGE_KEYS constants.
// =============================================================================

const safeJsonParse = <T>(value: string | null, fallback: T): T => {
  if (value === null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

// ---------------------------------------------------------------------------
// Data-driven mapping: slice key → { storageKey, defaultValue }
// The `satisfies` check ensures every key of PersistedState (except the
// optional _currencies field) is covered, without widening the inferred types.
// ---------------------------------------------------------------------------

const SLICE_STORAGE_MAP = {
  settings:          { storageKey: STORAGE_KEYS.SETTINGS,            defaultValue: DEFAULT_SETTINGS },
  clients:           { storageKey: STORAGE_KEYS.CLIENTS,             defaultValue: []               },
  invoices:          { storageKey: STORAGE_KEYS.INVOICES,            defaultValue: []               },
  savedItems:        { storageKey: STORAGE_KEYS.SAVED_ITEMS,         defaultValue: []               },
  snapshots:         { storageKey: STORAGE_KEYS.NET_WORTH_SNAPSHOTS, defaultValue: []               },
  expenses:          { storageKey: STORAGE_KEYS.EXPENSES,            defaultValue: []               },
  mappings:          { storageKey: STORAGE_KEYS.CATEGORY_MAPPINGS,   defaultValue: []               },
  cryptoWallets:     { storageKey: STORAGE_KEYS.CRYPTO_WALLETS,      defaultValue: []               },
  cryptoPositions:   { storageKey: STORAGE_KEYS.CRYPTO_POSITIONS,    defaultValue: []               },
  cryptoLastSyncAt:  { storageKey: STORAGE_KEYS.CRYPTO_LAST_SYNC,    defaultValue: null             },
  ibkrPositions:     { storageKey: STORAGE_KEYS.IBKR_POSITIONS,      defaultValue: []               },
  ibkrCashBalances:  { storageKey: STORAGE_KEYS.IBKR_CASH_BALANCES,  defaultValue: []               },
  ibkrLastSyncAt:    { storageKey: STORAGE_KEYS.IBKR_LAST_SYNC,      defaultValue: null             },
  ibkrAccountId:     { storageKey: STORAGE_KEYS.IBKR_ACCOUNT_ID,     defaultValue: null             },
  ibkrNav:           { storageKey: STORAGE_KEYS.IBKR_NAV,            defaultValue: null             },
} satisfies Record<keyof Omit<PersistedState, '_currencies'>, { storageKey: string; defaultValue: unknown }>;

const multiKeyStorage: PersistStorage<PersistedState> = {
  getItem: (): StorageValue<PersistedState> | null => {
    try {
      const state = {} as PersistedState;
      for (const [slice, { storageKey, defaultValue }] of Object.entries(SLICE_STORAGE_MAP)) {
        (state as unknown as Record<string, unknown>)[slice] = safeJsonParse(
          localStorage.getItem(storageKey),
          defaultValue,
        );
      }
      return { state, version: 0 };
    } catch {
      return null;
    }
  },

  setItem: (_name: string, value: StorageValue<PersistedState>): void => {
    const { state } = value;
    try {
      for (const [slice, { storageKey }] of Object.entries(SLICE_STORAGE_MAP)) {
        localStorage.setItem(
          storageKey,
          JSON.stringify((state as unknown as Record<string, unknown>)[slice]),
        );
      }
    } catch (error) {
      console.error('Error persisting store to localStorage:', error);
    }
  },

  removeItem: (): void => {
    try {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error removing store from localStorage:', error);
    }
  },
};

// =============================================================================
// Store creation
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
      name: 'demeter-store', // Required by persist, but our custom storage ignores it
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
      partialize: (state): PersistedState => ({
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
      }),
    }
  )
);

// Re-export types for convenience
export type { StoreState, PersistedState } from './types';
