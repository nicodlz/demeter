const STORAGE_KEYS = {
  SETTINGS: 'uncertified-settings',
  CLIENTS: 'uncertified-clients',
  INVOICES: 'uncertified-invoices',
  SAVED_ITEMS: 'uncertified-saved-items',
  NET_WORTH_SNAPSHOTS: 'uncertified-net-worth-snapshots',
  EXPENSES: 'uncertified-expenses',
  CATEGORY_MAPPINGS: 'uncertified-category-mappings',
} as const;

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
};

export { STORAGE_KEYS };
