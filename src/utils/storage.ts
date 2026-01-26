const STORAGE_KEYS = {
  SETTINGS: 'demeter-settings',
  CLIENTS: 'demeter-clients',
  INVOICES: 'demeter-invoices',
  SAVED_ITEMS: 'demeter-saved-items',
  NET_WORTH_SNAPSHOTS: 'demeter-net-worth-snapshots',
  EXPENSES: 'demeter-expenses',
  CATEGORY_MAPPINGS: 'demeter-category-mappings',
} as const;

export interface DemeterBackup {
  version: number;
  exportedAt: string;
  data: {
    settings: unknown;
    clients: unknown;
    invoices: unknown;
    savedItems: unknown;
    netWorthSnapshots: unknown;
    expenses: unknown;
    categoryMappings: unknown;
  };
}

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
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

  importBackup: (backup: DemeterBackup): { success: boolean; error?: string } => {
    try {
      if (!backup.version || !backup.data) {
        return { success: false, error: 'Invalid backup file format' };
      }

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

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};

export { STORAGE_KEYS };
