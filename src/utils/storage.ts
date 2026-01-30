import type { z } from 'zod';
import {
  demeterBackupSchema,
  appSettingsSchema,
  clientSchema,
  invoiceSchema,
  savedItemSchema,
  anyNetWorthSnapshotSchema,
  expenseSchema,
  categoryMappingSchema,
  cryptoWalletSchema,
  tokenPositionSchema,
} from '../schemas';
import type { DemeterBackup } from '../schemas';

const STORAGE_KEYS = {
  SETTINGS: 'demeter-settings',
  CLIENTS: 'demeter-clients',
  INVOICES: 'demeter-invoices',
  SAVED_ITEMS: 'demeter-saved-items',
  NET_WORTH_SNAPSHOTS: 'demeter-net-worth-snapshots',
  EXPENSES: 'demeter-expenses',
  CATEGORY_MAPPINGS: 'demeter-category-mappings',
  CRYPTO_WALLETS: 'demeter-crypto-wallets',
  CRYPTO_POSITIONS: 'demeter-crypto-positions',
  CRYPTO_LAST_SYNC: 'demeter-crypto-last-sync',
} as const;

/**
 * Map storage keys to their Zod array schemas for automatic validation
 * when reading from localStorage.
 */
const STORAGE_SCHEMAS: Record<string, z.ZodType> = {
  [STORAGE_KEYS.SETTINGS]: appSettingsSchema,
  [STORAGE_KEYS.CLIENTS]: clientSchema.array(),
  [STORAGE_KEYS.INVOICES]: invoiceSchema.array(),
  [STORAGE_KEYS.SAVED_ITEMS]: savedItemSchema.array(),
  [STORAGE_KEYS.NET_WORTH_SNAPSHOTS]: anyNetWorthSnapshotSchema.array(),
  [STORAGE_KEYS.EXPENSES]: expenseSchema.array(),
  [STORAGE_KEYS.CATEGORY_MAPPINGS]: categoryMappingSchema.array(),
  [STORAGE_KEYS.CRYPTO_WALLETS]: cryptoWalletSchema.array(),
  [STORAGE_KEYS.CRYPTO_POSITIONS]: tokenPositionSchema.array(),
};

export const storage = {
  /**
   * Read a value from localStorage.
   * If the key has a known schema, the parsed data is validated automatically.
   * On validation failure the default value is returned and a warning is logged.
   *
   * An explicit `schema` parameter can override the built-in mapping.
   */
  get: <T>(key: string, defaultValue: T, schema?: z.ZodType<T>): T => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;

      const parsed = JSON.parse(item);
      const effectiveSchema = schema ?? STORAGE_SCHEMAS[key];

      if (effectiveSchema) {
        const result = effectiveSchema.safeParse(parsed);
        if (result.success) {
          return result.data as T;
        }
        console.warn(
          `[Demeter] Invalid data in localStorage key "${key}", using default value.`,
          result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        );
        return defaultValue;
      }

      return parsed as T;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  },

  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },

  exportAll: (): DemeterBackup => {
    const backup: DemeterBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        settings: storage.get(STORAGE_KEYS.SETTINGS, null),
        clients: storage.get(STORAGE_KEYS.CLIENTS, []),
        invoices: storage.get(STORAGE_KEYS.INVOICES, []),
        savedItems: storage.get(STORAGE_KEYS.SAVED_ITEMS, []),
        netWorthSnapshots: storage.get(STORAGE_KEYS.NET_WORTH_SNAPSHOTS, []),
        expenses: storage.get(STORAGE_KEYS.EXPENSES, []),
        categoryMappings: storage.get(STORAGE_KEYS.CATEGORY_MAPPINGS, []),
        cryptoWallets: storage.get(STORAGE_KEYS.CRYPTO_WALLETS, []),
        cryptoPositions: storage.get(STORAGE_KEYS.CRYPTO_POSITIONS, []),
        cryptoLastSync: storage.get<string | null>(STORAGE_KEYS.CRYPTO_LAST_SYNC, null),
      },
    };
    return backup;
  },

  downloadBackup: (): void => {
    const backup = storage.exportAll();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demeter-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Import a backup after validating it with the Zod schema.
   * Accepts `unknown` so callers can pass raw JSON.parse output safely.
   */
  importBackup: (rawData: unknown): { success: boolean; error?: string } => {
    try {
      const result = demeterBackupSchema.safeParse(rawData);

      if (!result.success) {
        const issues = result.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ');
        console.error('[Demeter] Backup validation failed:', result.error.issues);
        return { success: false, error: `Invalid backup format: ${issues}` };
      }

      const backup = result.data;

      // Import all data
      if (backup.data.settings) {
        storage.set(STORAGE_KEYS.SETTINGS, backup.data.settings);
      }
      if (backup.data.clients) {
        storage.set(STORAGE_KEYS.CLIENTS, backup.data.clients);
      }
      if (backup.data.invoices) {
        storage.set(STORAGE_KEYS.INVOICES, backup.data.invoices);
      }
      if (backup.data.savedItems) {
        storage.set(STORAGE_KEYS.SAVED_ITEMS, backup.data.savedItems);
      }
      if (backup.data.netWorthSnapshots) {
        storage.set(STORAGE_KEYS.NET_WORTH_SNAPSHOTS, backup.data.netWorthSnapshots);
      }
      if (backup.data.expenses) {
        storage.set(STORAGE_KEYS.EXPENSES, backup.data.expenses);
      }
      if (backup.data.categoryMappings) {
        storage.set(STORAGE_KEYS.CATEGORY_MAPPINGS, backup.data.categoryMappings);
      }
      if (backup.data.cryptoWallets) {
        storage.set(STORAGE_KEYS.CRYPTO_WALLETS, backup.data.cryptoWallets);
      }
      if (backup.data.cryptoPositions) {
        storage.set(STORAGE_KEYS.CRYPTO_POSITIONS, backup.data.cryptoPositions);
      }
      if (backup.data.cryptoLastSync) {
        storage.set(STORAGE_KEYS.CRYPTO_LAST_SYNC, backup.data.cryptoLastSync);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};

export { STORAGE_KEYS };
export type { DemeterBackup };
