/**
 * localStorage multi-key storage adapter for Zustand persist
 *
 * Maps each slice's data to its own localStorage key.
 * Also used as the fast offline cache when vault storage wraps it.
 */

import type { PersistStorage, StorageValue } from 'zustand/middleware';
import { STORAGE_KEYS } from '../utils/storage';
import { DEFAULT_SETTINGS } from '../utils/constants';
import type { PersistedState } from './types';

const safeJsonParse = <T>(value: string | null, fallback: T): T => {
  if (value === null) return fallback;
  try { return JSON.parse(value) as T; }
  catch { return fallback; }
};

/**
 * Data-driven mapping: slice key → { storageKey, defaultValue }
 * The `satisfies` ensures every key of PersistedState (except _currencies) is covered.
 */
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

export const multiKeyStorage: PersistStorage<PersistedState> = {
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
