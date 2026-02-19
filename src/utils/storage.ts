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
import { ibkrPositionSchema, ibkrCashBalanceSchema } from '../schemas/ibkr';
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
  IBKR_POSITIONS: 'demeter-ibkr-positions',
  IBKR_CASH_BALANCES: 'demeter-ibkr-cash-balances',
  IBKR_LAST_SYNC: 'demeter-ibkr-last-sync',
  IBKR_ACCOUNT_ID: 'demeter-ibkr-account-id',
  IBKR_NAV: 'demeter-ibkr-nav',
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
  [STORAGE_KEYS.IBKR_POSITIONS]: ibkrPositionSchema.array(),
  [STORAGE_KEYS.IBKR_CASH_BALANCES]: ibkrCashBalanceSchema.array(),
};

/**
 * Data-driven mapping from each backup field name to its localStorage key and
 * default value used during export.  Adding a new field only requires a single
 * entry here — `exportAll` and `importBackup` both derive their behaviour from
 * this table automatically.
 */
const BACKUP_FIELD_MAP = {
  settings:          { storageKey: STORAGE_KEYS.SETTINGS,            defaultValue: null },
  clients:           { storageKey: STORAGE_KEYS.CLIENTS,             defaultValue: [] },
  invoices:          { storageKey: STORAGE_KEYS.INVOICES,            defaultValue: [] },
  savedItems:        { storageKey: STORAGE_KEYS.SAVED_ITEMS,         defaultValue: [] },
  netWorthSnapshots: { storageKey: STORAGE_KEYS.NET_WORTH_SNAPSHOTS, defaultValue: [] },
  expenses:          { storageKey: STORAGE_KEYS.EXPENSES,            defaultValue: [] },
  categoryMappings:  { storageKey: STORAGE_KEYS.CATEGORY_MAPPINGS,   defaultValue: [] },
  cryptoWallets:     { storageKey: STORAGE_KEYS.CRYPTO_WALLETS,      defaultValue: [] },
  cryptoPositions:   { storageKey: STORAGE_KEYS.CRYPTO_POSITIONS,    defaultValue: [] },
  cryptoLastSync:    { storageKey: STORAGE_KEYS.CRYPTO_LAST_SYNC,    defaultValue: null },
  ibkrPositions:     { storageKey: STORAGE_KEYS.IBKR_POSITIONS,      defaultValue: [] },
  ibkrCashBalances:  { storageKey: STORAGE_KEYS.IBKR_CASH_BALANCES,  defaultValue: [] },
  ibkrLastSync:      { storageKey: STORAGE_KEYS.IBKR_LAST_SYNC,      defaultValue: null },
  ibkrAccountId:     { storageKey: STORAGE_KEYS.IBKR_ACCOUNT_ID,     defaultValue: null },
  ibkrNav:           { storageKey: STORAGE_KEYS.IBKR_NAV,            defaultValue: null },
} satisfies Record<keyof DemeterBackup['data'], { storageKey: string; defaultValue: unknown }>;

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
    const entries = (
      Object.entries(BACKUP_FIELD_MAP) as Array<
        [keyof DemeterBackup['data'], { storageKey: string; defaultValue: unknown }]
      >
    ).map(([key, { storageKey, defaultValue }]) => [key, storage.get(storageKey, defaultValue)]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: Object.fromEntries(entries) as DemeterBackup['data'],
    };
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

      // Import all fields via the shared mapping — null/undefined values are skipped.
      for (const [key, { storageKey }] of Object.entries(BACKUP_FIELD_MAP) as Array<
        [keyof DemeterBackup['data'], { storageKey: string }]
      >) {
        const value = backup.data[key];
        if (value != null) {
          storage.set(storageKey, value);
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};

export { STORAGE_KEYS };
export type { DemeterBackup };
