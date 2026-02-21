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
    docUid: null,
    docVersion: 0,
    lastPushedJson: "",
    pushTimer: null,
    unsubscribe: null,
  };

  let stopped = false;

  // ─── Pull: vault → store ───

  async function pull(): Promise<void> {
    try {
      const docs = await collection.list();

      if (docs.length === 0) {
        // No data in vault — push current localStorage state as initial seed
        await push(partialize(useStore.getState()));
        return;
      }

      // Use the first (and only) document
      const doc = docs[0];
      sync.docUid = doc.uid;
      sync.docVersion = doc.version;

      // Merge vault data into store (vault wins for existing fields)
      const currentState = partialize(useStore.getState());
      const merged = { ...currentState, ...doc.content };

      useStore.setState(merged);
      sync.lastPushedJson = JSON.stringify(merged);

      console.log("[demeter:vault] Pulled and merged from vault");
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
        doc = await collection.update(sync.docUid, state);
      } else {
        doc = await collection.create(state);
      }

      sync.docUid = doc.uid;
      sync.docVersion = doc.version;
      sync.lastPushedJson = JSON.stringify(state);
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
