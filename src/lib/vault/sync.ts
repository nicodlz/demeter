/**
 * Vault ↔ Store sync engine
 *
 * Bridges the zustand store (localStorage) with the encrypted vault.
 * NOT a storage adapter — a side-effect that runs after auth.
 *
 * Strategy:
 *   - Single encrypted document ("demeter-state") in the vault
 *   - On mount: pull from vault → merge into store via setState
 *   - On store change: debounce → push entire state to vault
 *   - On sign-out: flush pending changes before the session is torn down
 */

import type { DocumentClient, Collection, Document } from "@ursalock/client";
import { useStore, partialize } from "@/store";
import type { PersistedState } from "@/store/types";

/** Collection name for the state document */
const COLLECTION_NAME = "demeter-state";

/** Debounce delay for push (ms) */
const PUSH_DEBOUNCE_MS = 2_000;

/** Delay before retrying a failed push (ms) */
const PUSH_RETRY_MS = 5_000;

/** localStorage key for persisted doc UID (avoids list() on subsequent boots) */
const DOC_UID_STORAGE_KEY = "demeter:vault:docUid";

export type VaultSyncStatus =
  "idle" | "pulling" | "syncing" | "synced" | "offline" | "error";

export interface VaultSyncHandle {
  /** Resolves once the initial pull and subscription are complete. */
  ready: Promise<void>;
  /** Stop syncing and cancel pending timers. */
  stop: () => void;
  /** Push pending changes immediately (used before sign-out). */
  flush: () => Promise<void>;
  /** Re-pull the vault document. */
  pull: () => Promise<void>;
}

interface VaultSyncOptions {
  onStatus?: (status: VaultSyncStatus, error?: string) => void;
}

interface SyncState {
  /** Document UID in the vault (null = first sync, needs create) */
  docUid: string | null;
  /** Document version for optimistic locking */
  docVersion: number;
  /** Last pushed JSON (skip if unchanged) */
  lastPushedJson: string;
  /** Debounce timer */
  pushTimer: ReturnType<typeof setTimeout> | null;
  /** Retry timer */
  retryTimer: ReturnType<typeof setTimeout> | null;
  /** Unsubscribe from store */
  unsubscribe: (() => void) | null;
}

const isConflictError = (error: unknown): boolean =>
  error instanceof Error && /conflict/i.test(error.message);

/**
 * Start syncing the zustand store with the encrypted vault.
 *
 * @param documentClient  Initialized DocumentClient with derived keys
 * @param options         Status callback for UI feedback
 */
export function startVaultSync(
  documentClient: DocumentClient,
  options: VaultSyncOptions = {},
): VaultSyncHandle {
  const collection: Collection<PersistedState> =
    documentClient.collection<PersistedState>(COLLECTION_NAME);

  const sync: SyncState = {
    docUid: localStorage.getItem(DOC_UID_STORAGE_KEY),
    docVersion: 0,
    lastPushedJson: "",
    pushTimer: null,
    retryTimer: null,
    unsubscribe: null,
  };

  let stopped = false;
  let initialPullDone = false;
  let pendingState: PersistedState | null = null;

  const report = (status: VaultSyncStatus, error?: string): void => {
    options.onStatus?.(status, error);
  };

  const clearTimers = (): void => {
    if (sync.pushTimer) clearTimeout(sync.pushTimer);
    if (sync.retryTimer) clearTimeout(sync.retryTimer);
    sync.pushTimer = null;
    sync.retryTimer = null;
  };

  // ─── Pull: vault → store ───

  async function pull(): Promise<void> {
    if (stopped) return;
    report("pulling");

    try {
      let doc: Document<PersistedState> | null = null;

      // Fast path: if we know the doc UID, fetch directly (1 request)
      if (sync.docUid) {
        try {
          doc = await collection.get(sync.docUid);
        } catch {
          // Doc may have been deleted — fall through to list
          sync.docUid = null;
        }
      }

      // Slow path: list to discover the document
      if (!doc) {
        const docs = await collection.list({ limit: 1 });
        doc = docs[0] ?? null;
      }

      if (!doc) {
        // No data in vault — push current localStorage state as initial seed
        await push(partialize(useStore.getState()));
        return;
      }

      sync.docUid = doc.uid;
      sync.docVersion = doc.version;
      persistDocUid(doc.uid);

      // Vault wins for existing slices. Local defaults are spread first so new
      // slices (not yet in the vault) keep their defaults.
      // Handle double-nested content (legacy documents stored the full wrapper)
      const rawContent = doc.content as unknown as Record<string, unknown>;
      const vaultData: PersistedState = rawContent.content
        ? (rawContent.content as PersistedState)
        : doc.content;
      const local = partialize(useStore.getState());
      const merged = { ...local, ...vaultData };
      const mergedJson = JSON.stringify(merged);

      // Set lastPushedJson BEFORE setState so the subscription sees no diff.
      sync.lastPushedJson = mergedJson;
      pendingState = merged;
      useStore.setState(merged);
      report("synced");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      report("offline", message);
    } finally {
      initialPullDone = true;
    }
  }

  // ─── Push: store → vault ───

  async function push(state: PersistedState): Promise<void> {
    if (stopped) return;
    pendingState = state;
    report("syncing");

    try {
      let doc: Document<PersistedState>;

      if (sync.docUid) {
        doc = await collection.replace(sync.docUid, state, sync.docVersion);
      } else {
        doc = await collection.create(state);
      }

      sync.docUid = doc.uid;
      sync.docVersion = doc.version;
      sync.lastPushedJson = JSON.stringify(state);
      pendingState = null;
      persistDocUid(doc.uid);
      report("synced");
    } catch (err) {
      if (isConflictError(err) && sync.docUid) {
        // Refresh only the document version, then retry with the local state.
        // The previous implementation re-pulled and silently discarded the
        // local edit that triggered the conflict.
        try {
          const latest = await collection.get(sync.docUid);
          sync.docVersion = latest.version;
          const doc = await collection.replace(
            sync.docUid,
            state,
            sync.docVersion,
          );
          sync.docVersion = doc.version;
          sync.lastPushedJson = JSON.stringify(state);
          pendingState = null;
          report("synced");
          return;
        } catch (retryErr) {
          const message =
            retryErr instanceof Error ? retryErr.message : String(retryErr);
          report("error", message);
          scheduleRetry();
          return;
        }
      }

      const message = err instanceof Error ? err.message : String(err);
      report("error", message);
      scheduleRetry();
    }
  }

  function scheduleRetry(): void {
    if (stopped || sync.retryTimer || !pendingState) return;
    sync.retryTimer = setTimeout(() => {
      sync.retryTimer = null;
      const state = pendingState;
      if (state) void push(state);
    }, PUSH_RETRY_MS);
  }

  function schedulePush(state: PersistedState): void {
    if (!initialPullDone || stopped) return;
    const json = JSON.stringify(state);
    if (json === sync.lastPushedJson) return;

    pendingState = state;
    report("syncing");

    if (sync.pushTimer) clearTimeout(sync.pushTimer);
    sync.pushTimer = setTimeout(() => {
      sync.pushTimer = null;
      const current = pendingState;
      if (current) void push(current);
    }, PUSH_DEBOUNCE_MS);
  }

  // ─── Helpers ───

  function persistDocUid(uid: string): void {
    try {
      localStorage.setItem(DOC_UID_STORAGE_KEY, uid);
    } catch {
      /* ignore */
    }
  }

  async function flush(): Promise<void> {
    clearTimers();
    const state = pendingState ?? partialize(useStore.getState());
    if (JSON.stringify(state) !== sync.lastPushedJson) {
      await push(state);
    }
  }

  // ─── Lifecycle ───

  let resolveReady: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  // 1. Pull on start, THEN subscribe to store changes.
  //    Subscribing only after pull completes prevents stale localStorage
  //    data from being pushed to the vault before we've loaded the truth.
  pull()
    .catch(() => {
      /* handled inside */
    })
    .finally(() => {
      if (!stopped) {
        sync.unsubscribe = useStore.subscribe((state) => {
          if (stopped) return;
          schedulePush(partialize(state));
        });
      }
      resolveReady();
    });

  return {
    ready,
    stop: () => {
      stopped = true;
      clearTimers();
      if (sync.unsubscribe) sync.unsubscribe();
      report("idle");
    },
    flush,
    pull,
  };
}

/** Clear sync metadata from localStorage (called on signOut) */
export function clearSyncState(): void {
  try {
    localStorage.removeItem(DOC_UID_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
