/**
 * UrsaLock-backed PersistStorage adapter for Zustand
 *
 * Wraps the existing multiKeyStorage (localStorage) with vault sync:
 *   getItem: reads from localStorage (instant), pulls from vault in background
 *   setItem: writes to localStorage (instant), debounces push to vault
 *
 * Each PersistedState field → one encrypted document in the "state" collection.
 * Document content: { key: string; value: unknown }
 */

import type { PersistStorage, StorageValue } from "zustand/middleware";
import { DocumentClient, type Collection, type Document } from "@ursalock/client";
import type { PersistedState } from "@/store/types";
import { multiKeyStorage } from "@/store/storage";

/** Shape of each state document in the vault */
interface StateDoc {
  key: string;
  value: unknown;
}

/** Debounce delay for vault push (ms) */
const PUSH_DEBOUNCE_MS = 2_000;

/**
 * Create a vault-backed storage adapter that wraps localStorage.
 *
 * @param documentClient  Initialized DocumentClient with encryption keys
 * @returns               PersistStorage compatible with zustand persist v5
 */
export function createVaultStorage(
  documentClient: DocumentClient,
): PersistStorage<PersistedState> {
  const collection: Collection<StateDoc> = documentClient.collection<StateDoc>("state");

  // Track document UIDs by key for updates (populated on first pull)
  const docUidMap = new Map<string, { uid: string; version: number }>();
  let pushTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPushedJson = "";

  // ─── Vault sync ───

  async function pullFromVault(): Promise<Partial<PersistedState> | null> {
    try {
      const docs = await collection.list();
      if (docs.length === 0) return null;

      const state: Record<string, unknown> = {};
      for (const doc of docs) {
        state[doc.content.key] = doc.content.value;
        docUidMap.set(doc.content.key, { uid: doc.uid, version: doc.version });
      }
      return state as Partial<PersistedState>;
    } catch (err) {
      console.warn("[demeter:vault] Pull failed:", err);
      return null;
    }
  }

  async function pushToVault(state: PersistedState): Promise<void> {
    const keys = Object.keys(state) as (keyof PersistedState)[];

    await Promise.allSettled(
      keys.map(async (key) => {
        const value = state[key];
        const existing = docUidMap.get(key);

        try {
          let doc: Document<StateDoc>;
          if (existing) {
            doc = await collection.update(existing.uid, { key, value });
          } else {
            doc = await collection.create({ key, value });
          }
          docUidMap.set(key, { uid: doc.uid, version: doc.version });
        } catch (err) {
          console.warn(`[demeter:vault] Push "${key}" failed:`, err);
        }
      }),
    );
  }

  // ─── PersistStorage interface ───

  return {
    getItem: (name: string): StorageValue<PersistedState> | null => {
      // Synchronous: delegate to localStorage adapter
      const cached = multiKeyStorage.getItem(name);

      // Background: pull from vault and merge
      pullFromVault()
        .then((vaultState) => {
          if (!vaultState) return;

          // Merge: vault wins for data fields, localStorage fills gaps
          const merged: StorageValue<PersistedState> = {
            state: { ...(cached?.state ?? {} as PersistedState), ...vaultState } as PersistedState,
            version: 0,
          };

          // Write merged state back to localStorage
          multiKeyStorage.setItem(name, merged);

          // Notify zustand of updated state via storage event
          window.dispatchEvent(
            new StorageEvent("storage", {
              key: name,
              newValue: JSON.stringify(merged),
            }),
          );
        })
        .catch(() => { /* offline is fine */ });

      return cached;
    },

    setItem: (name: string, value: StorageValue<PersistedState>): void => {
      // Synchronous: write to localStorage immediately
      multiKeyStorage.setItem(name, value);

      // Debounced: push to vault
      const json = JSON.stringify(value.state);
      if (json === lastPushedJson) return;

      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        lastPushedJson = json;
        pushToVault(value.state).catch((err) => {
          console.warn("[demeter:vault] Background push failed:", err);
        });
      }, PUSH_DEBOUNCE_MS);
    },

    removeItem: (name: string): void => {
      multiKeyStorage.removeItem(name);
    },
  };
}
