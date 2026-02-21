/**
 * Vault authentication context for Demeter
 *
 * Provides auth state + DocumentClient to the app tree.
 * After passkey auth, derives encryption keys and creates the DocumentClient
 * that powers the storage adapter.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  useSignUp,
  useSignIn,
  usePasskeySupport,
  useAuth,
  useSignOut,
  DocumentClient,
  type ZKCredential,
} from "@ursalock/client";
import { vaultClient, SERVER_URL } from "./client";
import { deriveKeysFromJwk } from "./keys";

// ─── Types ───

interface VaultContextValue {
  /** User has authenticated and keys are derived */
  isReady: boolean;
  /** Auth is in progress (initial check or sign-in) */
  isLoading: boolean;
  /** Last error message */
  error: string | null;
  /** Browser supports passkeys */
  supportsPasskey: boolean;
  /** Initialized DocumentClient (null until auth completes) */
  documentClient: DocumentClient | null;
  /** Auth actions */
  signIn: () => Promise<void>;
  signUp: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

// ─── Provider ───

interface VaultProviderProps {
  children: ReactNode;
}

export function VaultProvider({ children }: VaultProviderProps) {
  const [documentClient, setDocumentClient] = useState<DocumentClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const supportsPasskey = usePasskeySupport(vaultClient);
  const authState = useAuth(vaultClient);
  const { signUp: rawSignUp, isLoading: isSigningUp } = useSignUp(vaultClient);
  const { signIn: rawSignIn, isLoading: isSigningIn } = useSignIn(vaultClient);
  const rawSignOut = useSignOut(vaultClient);

  const isLoading = authState.isLoading || isSigningUp || isSigningIn || isInitializing;

  /**
   * After auth, derive keys and create DocumentClient.
   * We need the vault UID — fetch it by name (auto-create on first use).
   */
  const initializeDocumentClient = useCallback(async (credential: ZKCredential) => {
    setIsInitializing(true);
    setError(null);

    try {
      // 1. Get or create the vault by name
      const vaultRes = await vaultClient.fetch("/vault/by-name/demeter");

      let vaultUid: string;
      if (vaultRes.ok) {
        const vault = (await vaultRes.json()) as { uid: string };
        vaultUid = vault.uid;
      } else if (vaultRes.status === 404) {
        // Create the vault
        const createRes = await vaultClient.fetch("/vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "demeter",
            data: btoa("demeter-vault"), // Placeholder blob (required by schema)
            salt: btoa("demeter-salt"),
          }),
        });
        if (!createRes.ok) throw new Error(`Failed to create vault: ${createRes.status}`);
        const created = (await createRes.json()) as { uid: string };
        vaultUid = created.uid;
      } else {
        throw new Error(`Vault lookup failed: ${vaultRes.status}`);
      }

      // 2. Derive encryption keys from passkey CipherJWK
      const keys = await deriveKeysFromJwk(credential.cipherJwk, vaultUid);

      // 3. Create DocumentClient
      const client = new DocumentClient({
        serverUrl: SERVER_URL,
        vaultUid,
        encryptionKey: keys.encryptionKey,
        hmacKey: keys.hmacKey,
        getAuthHeader: () => vaultClient.getAuthHeader(),
      });

      setDocumentClient(client);
    } catch (err) {
      console.error("[demeter:vault] Initialization failed:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Auto-initialize when we have a credential
  useEffect(() => {
    if (authState.credential && !documentClient && !isInitializing && !error) {
      void initializeDocumentClient(authState.credential);
    }
  }, [authState.credential, documentClient, isInitializing, error, initializeDocumentClient]);

  // ─── Actions ───

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const result = await rawSignIn({ usePasskey: true });
      if (!result.success) {
        setError(result.error ?? "Sign in failed");
        return;
      }
      if (result.credential) {
        await initializeDocumentClient(result.credential);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    }
  }, [rawSignIn, initializeDocumentClient]);

  const signUp = useCallback(async () => {
    setError(null);
    try {
      const result = await rawSignUp({ usePasskey: true });
      if (!result.success) {
        setError(result.error ?? "Sign up failed");
        return;
      }
      if (result.credential) {
        await initializeDocumentClient(result.credential);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    }
  }, [rawSignUp, initializeDocumentClient]);

  const signOut = useCallback(async () => {
    await rawSignOut();
    setDocumentClient(null);
    setError(null);
  }, [rawSignOut]);

  const clearError = useCallback(() => setError(null), []);

  const value: VaultContextValue = {
    isReady: documentClient !== null,
    isLoading,
    error,
    supportsPasskey,
    documentClient,
    signIn,
    signUp,
    signOut,
    clearError,
  };

  return (
    <VaultContext.Provider value={value}>
      {children}
    </VaultContext.Provider>
  );
}

// ─── Hook ───

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
