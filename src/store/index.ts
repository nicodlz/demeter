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

const multiKeyStorage: PersistStorage<PersistedState> = {
  getItem: (): StorageValue<PersistedState> | null => {
    try {
      const state: PersistedState = {
        settings: safeJsonParse(
          localStorage.getItem(STORAGE_KEYS.SETTINGS),
          DEFAULT_SETTINGS
        ),
        clients: safeJsonParse(
          localStorage.getItem(STORAGE_KEYS.CLIENTS),
          []
        ),
        invoices: safeJsonParse(
          localStorage.getItem(STORAGE_KEYS.INVOICES),
          []
        ),
        savedItems: safeJsonParse(
          localStorage.getItem(STORAGE_KEYS.SAVED_ITEMS),
          []
        ),
        snapshots: safeJsonParse(
          localStorage.getItem(STORAGE_KEYS.NET_WORTH_SNAPSHOTS),
          []
        ),
        expenses: safeJsonParse(
          localStorage.getItem(STORAGE_KEYS.EXPENSES),
          []
        ),
        mappings: safeJsonParse(
          localStorage.getItem(STORAGE_KEYS.CATEGORY_MAPPINGS),
          []
        ),
      };
      return { state, version: 0 };
    } catch {
      return null;
    }
  },

  setItem: (_name: string, value: StorageValue<PersistedState>): void => {
    const { state } = value;
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(state.clients));
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(state.invoices));
      localStorage.setItem(STORAGE_KEYS.SAVED_ITEMS, JSON.stringify(state.savedItems));
      localStorage.setItem(STORAGE_KEYS.NET_WORTH_SNAPSHOTS, JSON.stringify(state.snapshots));
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(state.expenses));
      localStorage.setItem(STORAGE_KEYS.CATEGORY_MAPPINGS, JSON.stringify(state.mappings));
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
    }),
    {
      name: 'demeter-store', // Required by persist, but our custom storage ignores it
      storage: multiKeyStorage,
      partialize: (state): PersistedState => ({
        settings: state.settings,
        clients: state.clients,
        invoices: state.invoices,
        savedItems: state.savedItems,
        snapshots: state.snapshots,
        expenses: state.expenses,
        mappings: state.mappings,
      }),
    }
  )
);

// Re-export types for convenience
export type { StoreState, PersistedState } from './types';
