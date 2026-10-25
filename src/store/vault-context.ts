import { createContext } from "react";
import type { VaultSyncStatus } from "@/lib/vault/sync";

export interface VaultContextValue {
  /** User is authenticated and vault sync is running */
  isReady: boolean;
  /** Auth or initialization in progress */
  isLoading: boolean;
  /** Last error message */
  error: string | null;
  /** Browser supports passkeys */
  supportsPasskey: boolean;
  /** Current vault sync status (for the UI indicator) */
  syncStatus: VaultSyncStatus;
  /** Auth actions */
  signIn: () => Promise<void>;
  signUp: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  /** Retry initialization after a failure */
  retry: () => void;
}

export const VaultContext = createContext<VaultContextValue | null>(null);
