/**
 * Key derivation from passkey CipherJWK
 *
 * Extracts the raw AES master key from the JWK `k` field (base64url),
 * then derives vault-specific encryption + HMAC keys via HKDF.
 *
 * Browser-safe: uses atob (no Node.js Buffer).
 */

import { deriveVaultKeys, type CipherJWK } from "@ursalock/crypto";

export type { CipherJWK };

/** Decode base64url string to Uint8Array (browser-safe) */
function base64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Derive vault encryption + HMAC keys from the passkey CipherJWK.
 *
 * @param cipherJwk  JWK from ZKCredential (contains raw AES key)
 * @param vaultUid   Vault UID (used as HKDF context)
 * @returns          { encryptionKey, hmacKey, indexKey } — 32-byte Uint8Arrays
 */
export async function deriveKeysFromJwk(cipherJwk: CipherJWK, vaultUid: string) {
  const masterKey = base64urlToBytes(cipherJwk.k);
  return deriveVaultKeys(masterKey, vaultUid);
}
