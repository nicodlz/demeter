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
 *
 * Why one document instead of one per slice:
 *   - 1 HTTP request instead of 15
 *   - 1 encrypt/decrypt instead of 15
 *   - Atomic: all-or-nothing, no partial state
 *   - PersistedState is small (<1MB for a personal finance app)
 */

import type { DocumentClient, Collection, Document } from "@ursalock/client";
import { useStore, partialize } from "@/store";
import type { PersistedState } from "@/store/types";

/** Collection name for the state document */
const COLLECTION_NAME = "demeter-state";

/** Debounce delay for push (ms) */
const PUSH_DEBOUNCE_MS = 2_000;

/** localStorage key for persisted doc UID (avoids list() on subsequent boots) */
const DOC_UID_STORAGE_KEY = "demeter:vault:docUid";

interface SyncState {
  /** Document UID in the vault (null = first sync, needs create) */
  docUid: string | null;
  /** Document version for optimistic locking */
  docVersion: number;
  /** Last pushed JSON (skip if unchanged) */
  lastPushedJson: string;
  /** Debounce timer */
  pushTimer: ReturnType<typeof setTimeout> | null;
  /** Unsubscribe from store */
  unsubscribe: (() => void) | null;
}

/**
 * Start syncing the zustand store with the encrypted vault.
 *
 * @param documentClient  Initialized DocumentClient with derived keys
 * @returns               Cleanup function (call on unmount / signOut)
 */
export function startVaultSync(documentClient: DocumentClient): () => void {
  const collection: Collection<PersistedState> = documentClient.collection<PersistedState>(COLLECTION_NAME);

  const sync: SyncState = {
    docUid: localStorage.getItem(DOC_UID_STORAGE_KEY),
    docVersion: 0,
    lastPushedJson: "",
    pushTimer: null,
    unsubscribe: null,
  };

  let stopped = false;

  // ─── Pull: vault → store ───

  async function pull(): Promise<void> {
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

      // Safe merge: vault wins, but keep local defaults for any fields missing
      // from the vault (e.g. new slices added after last sync). This prevents
      // the store from losing fields that the vault document doesn't know about yet.
      // True CRDT conflict resolution is deferred to Phase 4.
      const merged = { ...partialize(useStore.getState()), ...doc.content };
      useStore.setState(merged);
      sync.lastPushedJson = JSON.stringify(merged);

      console.log("[demeter:vault] Pulled from vault (v%d)", doc.version);
    } catch (err) {
      console.warn("[demeter:vault] Pull failed (offline?):", err);
    }
  }

  // ─── Push: store → vault ───

  async function push(state: PersistedState): Promise<void> {
    if (stopped) return;

    try {
      let doc: Document<PersistedState>;

      if (sync.docUid) {
        // replace() = single PUT, no extra GET (unlike update() which fetches first)
        doc = await collection.replace(sync.docUid, state, sync.docVersion);
      } else {
        doc = await collection.create(state);
      }

      sync.docUid = doc.uid;
      sync.docVersion = doc.version;
      sync.lastPushedJson = JSON.stringify(state);
      persistDocUid(doc.uid);
    } catch (err) {
      // On conflict, re-pull to get fresh version then retry
      if (err instanceof Error && err.message.includes("Conflict")) {
        console.warn("[demeter:vault] Conflict — re-pulling");
        await pull();
      } else {
        console.warn("[demeter:vault] Push failed:", err);
      }
    }
  }

  function schedulePush(state: PersistedState): void {
    const json = JSON.stringify(state);
    if (json === sync.lastPushedJson) return;

    if (sync.pushTimer) clearTimeout(sync.pushTimer);
    sync.pushTimer = setTimeout(() => {
      push(state).catch((err) => {
        console.warn("[demeter:vault] Background push failed:", err);
      });
    }, PUSH_DEBOUNCE_MS);
  }

  // ─── Helpers ───

  function persistDocUid(uid: string): void {
    try { localStorage.setItem(DOC_UID_STORAGE_KEY, uid); } catch { /* ignore */ }
  }

  // ─── Lifecycle ───

  // 1. Pull on start
  pull().catch(() => { /* handled inside */ });

  // 2. Subscribe to store changes → debounced push
  sync.unsubscribe = useStore.subscribe((state) => {
    if (stopped) return;
    schedulePush(partialize(state));
  });

  // 3. Cleanup
  return () => {
    stopped = true;
    if (sync.pushTimer) clearTimeout(sync.pushTimer);
    if (sync.unsubscribe) sync.unsubscribe();
  };
}

/** Clear sync metadata from localStorage (called on signOut) */
export function clearSyncState(): void {
  try { localStorage.removeItem(DOC_UID_STORAGE_KEY); } catch { /* ignore */ }
}
