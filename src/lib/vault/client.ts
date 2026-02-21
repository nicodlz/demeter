/**
 * VaultClient singleton for Demeter
 * Handles passkey auth against the UrsaLock server.
 */

import { VaultClient } from "@ursalock/client";

export const SERVER_URL = import.meta.env.VITE_VAULT_SERVER_URL ?? "https://vault.ndlz.net";

/** Vault name on the server (auto-created on first use) */
export const VAULT_NAME = "demeter";

export const vaultClient = new VaultClient({
  serverUrl: SERVER_URL,
  rpName: VAULT_NAME,
  storageKey: "demeter:auth",
});
