/**
 * Vault authentication context for Demeter
 *
 * Provides auth state to the app tree.
 * After passkey auth: derives keys, creates DocumentClient, starts vault sync.
 */

import {
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
import {
  startVaultSync,
  clearSyncState,
  type VaultSyncHandle,
  type VaultSyncStatus,
} from "./sync";
import { multiKeyStorage } from "@/store/storage";
import { resetStore } from "@/store";
import { VaultContext } from "@/store/vault-context";

/** Maximum time spent flushing pending edits before sign-out. */
const SIGN_OUT_FLUSH_TIMEOUT_MS = 5_000;

/** Maximum time to wait for the initial vault pull before rendering the app. */
const INITIAL_SYNC_TIMEOUT_MS = 10_000;

const withTimeout = async <T,>(
  promise: Promise<T>,
  ms: number,
): Promise<void> => {
  await Promise.race([
    promise.then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ]);
};

// ─── Provider ───

export function VaultProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<VaultSyncStatus>("idle");

  // Ref to hold the active sync handle
  const syncHandleRef = useRef<VaultSyncHandle | null>(null);
  // Ref to hold last credential for retry
  const credentialRef = useRef<ZKCredential | null>(null);

  const supportsPasskey = usePasskeySupport(vaultClient);
  const authState = useAuth(vaultClient);
  const { signUp: rawSignUp, isLoading: isSigningUp } = useSignUp(vaultClient);
  const { signIn: rawSignIn, isLoading: isSigningIn } = useSignIn(vaultClient);
  const rawSignOut = useSignOut(vaultClient);

  const isLoading =
    authState.isLoading || isSigningUp || isSigningIn || isInitializing;

  /**
   * After auth: get/create vault, derive keys, start sync.
   */
  const initialize = useCallback(async (credential: ZKCredential) => {
    setIsInitializing(true);
    setError(null);
    credentialRef.current = credential;

    try {
      // 1. Get or create vault by name
      const vaultRes = await vaultClient.fetch(`/vault/by-name/${VAULT_NAME}`);

      let vaultUid: string;
      if (vaultRes.ok) {
        vaultUid = ((await vaultRes.json()) as { uid: string }).uid;
      } else if (vaultRes.status === 404) {
        // First time: create vault with minimal placeholder
        // (data + salt are required by schema but unused in document mode)
        const createRes = await vaultClient.fetch("/vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: VAULT_NAME,
            data: btoa("\0"),
            salt: btoa("\0"),
          }),
        });
        if (!createRes.ok)
          throw new Error(`Failed to create vault: ${createRes.status}`);
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

      // 4. Start vault sync. Disposing a previous handle first avoids two
      //    subscriptions/pushers if initialization is retried.
      syncHandleRef.current?.stop();
      const handle = startVaultSync(documentClient, {
        onStatus: (status) => setSyncStatus(status),
      });
      syncHandleRef.current = handle;

      // Do not render editable data before the initial pull completes: a user
      // edit made during the pull would otherwise be overwritten by vault data.
      await withTimeout(handle.ready, INITIAL_SYNC_TIMEOUT_MS);
      if (syncHandleRef.current === handle) {
        setIsReady(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSyncStatus("error");
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Auto-initialize when credential is available (e.g. page refresh with saved session)
  useEffect(() => {
    if (authState.credential && !isReady && !isInitializing && !error) {
      // Defer so initialize()'s setState calls do not run synchronously in the
      // effect body.
      const timer = setTimeout(() => {
        void initialize(authState.credential!);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [authState.credential, isReady, isInitializing, error, initialize]);

  // Cleanup sync on unmount
  useEffect(() => {
    return () => {
      syncHandleRef.current?.stop();
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
    const handle = syncHandleRef.current;

    // Flush pending edits before tearing the session down. Without this, a
    // change made <2s before sign-out was cancelled by the debounce timer.
    if (handle) {
      try {
        await withTimeout(handle.flush(), SIGN_OUT_FLUSH_TIMEOUT_MS);
      } catch {
        /* ignore */
      }
      handle.stop();
      syncHandleRef.current = null;
    }

    // Sign out from server (local cleanup must happen even if this fails).
    try {
      await rawSignOut();
    } catch {
      /* ignore */
    }

    // Clear sensitive data from localStorage AND memory. The in-memory store
    // previously survived sign-out and could seed the next account's vault.
    resetStore();
    multiKeyStorage.removeItem("demeter-store");
    clearSyncState();
    try {
      localStorage.removeItem("exchange-rate-cache");
    } catch {
      /* ignore */
    }

    credentialRef.current = null;
    setIsReady(false);
    setError(null);
    setSyncStatus("idle");
  }, [rawSignOut]);

  const clearError = useCallback(() => setError(null), []);

  /** Retry initialization with last credential (e.g. after network failure) */
  const retry = useCallback(() => {
    if (credentialRef.current && !isInitializing) {
      setError(null);
      void initialize(credentialRef.current);
    }
  }, [initialize, isInitializing]);

  return (
    <VaultContext.Provider
      value={{
        isReady,
        isLoading,
        error,
        supportsPasskey,
        syncStatus,
        signIn,
        signUp,
        signOut,
        clearError,
        retry,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}
