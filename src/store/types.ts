import type {
  AppSettings,
  Client,
  Invoice,
  SavedItem,
  LineItem,
  AnyNetWorthSnapshot,
  NetWorthSnapshotV2,
  Expense,
  ParsedTransaction,
  BankProvider,
  CategoryMapping,
  CryptoWallet,
  TokenPosition,
} from '../types';
import type { IbkrPosition, IbkrCashBalance } from '../schemas/ibkr';

// ============= Settings Slice =============
export interface SettingsSlice {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  updateIssuer: (issuerData: Partial<AppSettings['issuer']>) => void;
  incrementInvoiceCounter: () => number;
}

// ============= Clients Slice =============
export interface ClientsSlice {
  clients: Client[];
  addClient: (client: Omit<Client, 'id'>) => Client;
  updateClient: (id: string, clientData: Partial<Client>) => void;
  deleteClient: (id: string) => void;
}

// ============= Invoices Slice =============
export interface InvoicesSlice {
  invoices: Invoice[];
  addInvoice: (invoice: Invoice) => Invoice;
  updateInvoice: (id: string, invoiceData: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
}

// ============= Saved Items Slice =============
export interface SavedItemsSlice {
  savedItems: SavedItem[];
  addSavedItem: (item: Omit<SavedItem, 'id' | 'createdAt' | 'usageCount'>) => SavedItem;
  saveFromLineItem: (lineItem: LineItem) => SavedItem;
  incrementUsage: (id: string) => void;
  updateSavedItem: (id: string, data: Partial<SavedItem>) => void;
  deleteSavedItem: (id: string) => void;
}

// ============= Net Worth Slice =============
export interface NetWorthSlice {
  snapshots: AnyNetWorthSnapshot[];
  addSnapshot: (snapshotData: Omit<NetWorthSnapshotV2, 'id' | 'createdAt' | 'updatedAt'>) => NetWorthSnapshotV2;
  updateSnapshot: (id: string, snapshotData: Omit<NetWorthSnapshotV2, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteSnapshot: (id: string) => void;
  importFromJSON: (jsonString: string) => boolean;
}

// ============= Expenses Slice =============
export interface ExpensesSlice {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Expense;
  addExpenses: (
    transactions: ParsedTransaction[],
    source: string,
    provider: BankProvider,
    categoryMapping?: (merchantName: string) => string | undefined,
  ) => Expense[];
  addRecurringIncome: (baseEntry: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>, months: number) => Expense[];
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  deleteExpenses: (ids: string[]) => void;
  updateCategoryForMerchant: (merchantName: string, category: string) => void;
}

// ============= Category Mappings Slice =============
export interface CategoryMappingsSlice {
  mappings: CategoryMapping[];
  setMerchantCategory: (merchantName: string, category: string) => void;
  deleteMapping: (id: string) => void;
  deleteMappingForMerchant: (merchantName: string) => void;
}

// ============= Crypto Slice =============
export interface CryptoSlice {
  cryptoWallets: CryptoWallet[];
  cryptoPositions: TokenPosition[];
  cryptoLastSyncAt: string | null;
  cryptoSyncing: boolean;
  addCryptoWallet: (wallet: Pick<CryptoWallet, 'label' | 'address'>) => CryptoWallet;
  removeCryptoWallet: (id: string) => void;
  updateCryptoWallet: (id: string, data: Partial<Pick<CryptoWallet, 'label' | 'address'>>) => void;
  setCryptoPositions: (positions: TokenPosition[]) => void;
  setCryptoSyncing: (syncing: boolean) => void;
  setCryptoLastSyncAt: (date: string | null) => void;
}

// ============= IBKR Slice =============
export interface IbkrSlice {
  ibkrPositions: IbkrPosition[];
  ibkrCashBalances: IbkrCashBalance[];
  ibkrLastSyncAt: string | null;
  ibkrSyncing: boolean;
  ibkrAccountId: string | null;
  ibkrNav: number | null;
  setIbkrPositions: (positions: IbkrPosition[]) => void;
  setIbkrCashBalances: (balances: IbkrCashBalance[]) => void;
  setIbkrSyncing: (syncing: boolean) => void;
  setIbkrLastSyncAt: (date: string | null) => void;
  setIbkrAccountId: (id: string | null) => void;
  setIbkrNav: (nav: number | null) => void;
}

// ============= Combined Store State =============
export type StoreState = SettingsSlice &
  ClientsSlice &
  InvoicesSlice &
  SavedItemsSlice &
  NetWorthSlice &
  ExpensesSlice &
  CategoryMappingsSlice &
  CryptoSlice &
  IbkrSlice;

// ============= Persisted State (data only, no actions) =============
export interface PersistedState {
  settings: AppSettings;
  clients: Client[];
  invoices: Invoice[];
  savedItems: SavedItem[];
  snapshots: AnyNetWorthSnapshot[];
  expenses: Expense[];
  mappings: CategoryMapping[];
  cryptoWallets: CryptoWallet[];
  cryptoPositions: TokenPosition[];
  cryptoLastSyncAt: string | null;
  ibkrPositions: IbkrPosition[];
  ibkrCashBalances: IbkrCashBalance[];
  ibkrLastSyncAt: string | null;
  ibkrAccountId: string | null;
  ibkrNav: number | null;
  _currencies?: Record<string, { rate: number; updatedAt: number }>;
}
