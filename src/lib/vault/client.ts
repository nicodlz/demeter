/**
 * VaultClient singleton for Demeter
 * Handles passkey auth against the UrsaLock server.
 */

import { VaultClient } from "@ursalock/client";

const SERVER_URL = import.meta.env.VITE_VAULT_SERVER_URL ?? "https://vault.ndlz.net";

export const vaultClient = new VaultClient({
  serverUrl: SERVER_URL,
  rpName: "demeter",
  storageKey: "demeter:auth",
});

export { SERVER_URL };
