/**
 * Vault authentication context for Demeter
 *
 * Provides auth state to the app tree.
 * After passkey auth: derives keys, creates DocumentClient, starts vault sync.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
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
import { vaultClient, SERVER_URL, VAULT_NAME } from "./client";
import { deriveKeysFromJwk } from "./keys";
import { startVaultSync } from "./sync";
import { multiKeyStorage } from "@/store/storage";

// ─── Types ───

interface VaultContextValue {
  /** User is authenticated and vault sync is running */
  isReady: boolean;
  /** Auth or initialization in progress */
  isLoading: boolean;
  /** Last error message */
  error: string | null;
  /** Browser supports passkeys */
  supportsPasskey: boolean;
  /** Auth actions */
  signIn: () => Promise<void>;
  signUp: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

// ─── Provider ───

export function VaultProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Ref to hold sync cleanup function
  const syncCleanupRef = useRef<(() => void) | null>(null);

  const supportsPasskey = usePasskeySupport(vaultClient);
  const authState = useAuth(vaultClient);
  const { signUp: rawSignUp, isLoading: isSigningUp } = useSignUp(vaultClient);
  const { signIn: rawSignIn, isLoading: isSigningIn } = useSignIn(vaultClient);
  const rawSignOut = useSignOut(vaultClient);

  const isLoading = authState.isLoading || isSigningUp || isSigningIn || isInitializing;

  /**
   * After auth: get/create vault, derive keys, start sync.
   */
  const initialize = useCallback(async (credential: ZKCredential) => {
    setIsInitializing(true);
    setError(null);

    try {
      // 1. Get or create vault by name
      const vaultRes = await vaultClient.fetch(`/vault/by-name/${VAULT_NAME}`);

      let vaultUid: string;
      if (vaultRes.ok) {
        vaultUid = ((await vaultRes.json()) as { uid: string }).uid;
      } else if (vaultRes.status === 404) {
        const createRes = await vaultClient.fetch("/vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: VAULT_NAME,
            data: btoa("init"),  // Placeholder blob (required by server schema)
            salt: btoa("init"),
          }),
        });
        if (!createRes.ok) throw new Error(`Failed to create vault: ${createRes.status}`);
        vaultUid = ((await createRes.json()) as { uid: string }).uid;
      } else {
        throw new Error(`Vault lookup failed: ${vaultRes.status}`);
      }

      // 2. Derive encryption keys from passkey
      const keys = await deriveKeysFromJwk(credential.cipherJwk, vaultUid);

      // 3. Create DocumentClient
      const documentClient = new DocumentClient({
        serverUrl: SERVER_URL,
        vaultUid,
        encryptionKey: keys.encryptionKey,
        hmacKey: keys.hmacKey,
        getAuthHeader: () => vaultClient.getAuthHeader(),
      });

      // 4. Start vault sync
      syncCleanupRef.current = startVaultSync(documentClient);
      setIsReady(true);
    } catch (err) {
      console.error("[demeter:vault] Initialization failed:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Auto-initialize when credential is available (e.g. page refresh with saved session)
  useEffect(() => {
    if (authState.credential && !isReady && !isInitializing && !error) {
      void initialize(authState.credential);
    }
  }, [authState.credential, isReady, isInitializing, error, initialize]);

  // Cleanup sync on unmount
  useEffect(() => {
    return () => {
      syncCleanupRef.current?.();
    };
  }, []);

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
        await initialize(result.credential);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    }
  }, [rawSignIn, initialize]);

  const signUp = useCallback(async () => {
    setError(null);
    try {
      const result = await rawSignUp({ usePasskey: true });
      if (!result.success) {
        setError(result.error ?? "Sign up failed");
        return;
      }
      if (result.credential) {
        await initialize(result.credential);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    }
  }, [rawSignUp, initialize]);

  const signOut = useCallback(async () => {
    // Stop vault sync
    syncCleanupRef.current?.();
    syncCleanupRef.current = null;

    // Sign out from server
    await rawSignOut();

    // Clear sensitive data from localStorage
    multiKeyStorage.removeItem("demeter-store");

    setIsReady(false);
    setError(null);
  }, [rawSignOut]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <VaultContext.Provider value={{
      isReady,
      isLoading,
      error,
      supportsPasskey,
      signIn,
      signUp,
      signOut,
      clearError,
    }}>
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
