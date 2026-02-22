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
  let initialPullDone = false;
  let lastPullTimestamp = 0;

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

      // Vault wins entirely. We spread local defaults first so new slices
      // (not yet in the vault) keep their defaults, then vault overwrites.
      // Handle double-nested content (legacy documents stored the full doc wrapper)
      const vaultData: PersistedState = (doc.content as Record<string, unknown>).content
        ? ((doc.content as Record<string, unknown>).content as PersistedState)
        : doc.content;
      const local = partialize(useStore.getState());
      const merged = { ...local, ...vaultData };
      const mergedJson = JSON.stringify(merged);

      // Set lastPushedJson BEFORE setState so the subscribe (once active)
      // sees no diff and skips the push.
      sync.lastPushedJson = mergedJson;

      useStore.setState(merged);

      console.log("[demeter:vault] Pulled from vault (v%d)", doc.version);
    } catch (err) {
      console.warn("[demeter:vault] Pull failed (offline?):", err);
    } finally {
      initialPullDone = true;
      lastPullTimestamp = Date.now();
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
    if (!initialPullDone) return;
    const json = JSON.stringify(state);
    if (json === sync.lastPushedJson) return;

    // Extra guard: if we just pulled, skip the first change notification
    // (it's the setState from pull itself propagating through persist middleware)
    if (Date.now() - lastPullTimestamp < PUSH_DEBOUNCE_MS + 500) return;

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

  // 1. Pull on start, THEN subscribe to store changes.
  //    Subscribing only after pull completes prevents stale localStorage
  //    data from being pushed to the vault before we've loaded the truth.
  pull()
    .catch(() => { /* handled inside */ })
    .finally(() => {
      if (stopped) return;
      sync.unsubscribe = useStore.subscribe((state) => {
        if (stopped) return;
        schedulePush(partialize(state));
      });
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
