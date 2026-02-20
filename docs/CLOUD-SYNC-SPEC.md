# Demeter Cloud Sync — Spécification Technique

## Objectifs

1. **Sync multi-device** — Accéder aux mêmes données depuis plusieurs appareils
2. **Sécurité équivalente au local** — Chiffrement E2EE, le serveur ne voit jamais les données en clair
3. **Compatibilité backward** — Les anciens exports JSON restent importables
4. **Passkey pour restauration** — Authentification sans mot de passe, récupération simple

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Zustand     │───▶│  Crypto      │───▶│  Sync        │       │
│  │  Store       │    │  Layer       │    │  Manager     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ localStorage │    │ Web Crypto   │    │ WebAuthn     │       │
│  │ (cache)      │    │ API          │    │ (Passkeys)   │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (encrypted blob)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          SERVER (Coolify)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Hono API    │───▶│  PostgreSQL  │    │  WebAuthn    │       │
│  │  /api/sync   │    │  (blobs)     │    │  Verifier    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
│  Le serveur stocke UNIQUEMENT :                                  │
│  - Blobs chiffrés (AES-256-GCM)                                 │
│  - Credentials WebAuthn (passkeys)                              │
│  - Metadata non-sensibles (timestamps, version)                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Modèle de données

### Côté serveur (PostgreSQL)

```sql
-- Utilisateurs (identifiés par passkey, pas d'email/password)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ
);

-- Passkeys WebAuthn
CREATE TABLE passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credential_id BYTEA UNIQUE NOT NULL,
  public_key BYTEA NOT NULL,
  counter INT DEFAULT 0,
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Blobs chiffrés (1 blob = 1 état complet)
CREATE TABLE encrypted_blobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Données chiffrées
  ciphertext BYTEA NOT NULL,           -- AES-256-GCM encrypted data
  iv BYTEA NOT NULL,                   -- 12 bytes IV
  salt BYTEA NOT NULL,                 -- 16 bytes salt pour PBKDF2
  
  -- Metadata (non chiffrées, non sensibles)
  version INT NOT NULL,                -- Pour résolution de conflits
  schema_version INT DEFAULT 1,        -- Version du format DemeterBackup
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte : 1 blob actif par user
  is_current BOOLEAN DEFAULT TRUE,
  
  UNIQUE(user_id, is_current) WHERE is_current = TRUE
);

-- Index pour requêtes rapides
CREATE INDEX idx_blobs_user ON encrypted_blobs(user_id, is_current);
CREATE INDEX idx_passkeys_credential ON passkeys(credential_id);
```

### Côté client (types TypeScript)

```typescript
// src/types/sync.ts

/** Clé de chiffrement dérivée (jamais stockée, recalculée) */
interface DerivedKey {
  key: CryptoKey;       // AES-256-GCM key
  salt: Uint8Array;     // Salt utilisé pour dérivation
}

/** Blob chiffré prêt pour upload */
interface EncryptedBlob {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  salt: Uint8Array;
  version: number;
  schemaVersion: number;
}

/** État de sync local */
interface SyncState {
  userId: string | null;
  lastSyncAt: string | null;
  localVersion: number;
  remoteVersion: number;
  syncStatus: 'idle' | 'syncing' | 'error' | 'conflict';
  error?: string;
}

/** Configuration passkey */
interface PasskeyInfo {
  credentialId: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string;
}
```

---

## Flux de chiffrement

### Dérivation de clé (PBKDF2 + AES-256-GCM)

```typescript
// src/utils/crypto.ts

const PBKDF2_ITERATIONS = 600_000; // OWASP 2023 recommendation
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * Dérive une clé AES-256 à partir d'un secret.
 * Le secret peut être :
 * - Un mot de passe utilisateur (legacy)
 * - Un secret dérivé du passkey (PRF extension)
 * - Une clé de récupération (32 bytes aléatoires, affichée une fois)
 */
async function deriveKey(
  secret: Uint8Array | string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const secretBytes = typeof secret === 'string' 
    ? new TextEncoder().encode(secret)
    : secret;

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Chiffre les données avec AES-256-GCM
 */
async function encrypt(
  data: DemeterBackup,
  key: CryptoKey,
  salt: Uint8Array
): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  return {
    ciphertext,
    iv,
    salt,
    version: Date.now(),
    schemaVersion: data.version,
  };
}

/**
 * Déchiffre les données
 */
async function decrypt(
  blob: EncryptedBlob,
  secret: Uint8Array | string
): Promise<DemeterBackup> {
  const key = await deriveKey(secret, blob.salt);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: blob.iv },
    key,
    blob.ciphertext
  );

  const json = new TextDecoder().decode(plaintext);
  return JSON.parse(json) as DemeterBackup;
}
```

---

## Passkey + Clé de récupération

### Problème

Les passkeys (WebAuthn) sont excellentes pour l'authentification, mais elles ne fournissent pas directement un secret stable pour le chiffrement.

### Solution : Clé de récupération

```
┌─────────────────────────────────────────────────────────────────┐
│                     PREMIER ENREGISTREMENT                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Utilisateur crée un compte avec passkey                     │
│                                                                  │
│  2. Le client génère une clé de récupération :                  │
│     recoveryKey = crypto.getRandomValues(32 bytes)              │
│     → Affichée UNE SEULE FOIS : "XXXX-XXXX-XXXX-XXXX-..."      │
│     → L'utilisateur doit la sauvegarder                         │
│                                                                  │
│  3. Cette clé est utilisée pour chiffrer les données            │
│                                                                  │
│  4. La clé est AUSSI chiffrée avec le passkey (via PRF ou       │
│     wrapping) et stockée sur le serveur                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     CONNEXION NORMALE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Utilisateur s'authentifie avec passkey                      │
│                                                                  │
│  2. Le serveur renvoie la clé de récupération chiffrée          │
│                                                                  │
│  3. Le client la déchiffre avec le passkey                      │
│                                                                  │
│  4. Utilise la clé pour déchiffrer les données                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     RÉCUPÉRATION (passkey perdu)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Utilisateur entre sa clé de récupération manuellement       │
│     "XXXX-XXXX-XXXX-XXXX-..."                                   │
│                                                                  │
│  2. Crée un nouveau passkey                                     │
│                                                                  │
│  3. La clé de récupération est re-wrappée avec le nouveau       │
│     passkey                                                      │
│                                                                  │
│  4. Données restaurées                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Format de la clé de récupération

```typescript
/**
 * Génère une clé de récupération lisible
 * Format : XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX (32 chars base32)
 */
function generateRecoveryKey(): { key: Uint8Array; display: string } {
  const key = crypto.getRandomValues(new Uint8Array(20)); // 160 bits
  
  // Encode en base32 (sans ambiguïté : pas de 0/O, 1/I/L)
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let display = '';
  
  // Conversion base32
  for (let i = 0; i < key.length; i += 5) {
    const chunk = key.slice(i, i + 5);
    // ... encoding logic
  }
  
  // Format avec tirets : XXXX-XXXX-...
  display = display.match(/.{1,4}/g)?.join('-') || display;
  
  return { key, display };
}
```

---

## Compatibilité avec les anciens exports

### Import d'un fichier JSON non chiffré

```typescript
// src/utils/storage.ts - Extension

/**
 * Import un backup (chiffré ou non).
 * Détecte automatiquement le format.
 */
async function importBackupUniversal(
  rawData: unknown,
  recoveryKey?: string
): Promise<{ success: boolean; error?: string }> {
  
  // Cas 1 : Export chiffré (nouveau format cloud)
  if (isEncryptedBackup(rawData)) {
    if (!recoveryKey) {
      return { success: false, error: 'Recovery key required for encrypted backup' };
    }
    const decrypted = await decrypt(rawData, recoveryKey);
    return storage.importBackup(decrypted);
  }
  
  // Cas 2 : Export JSON classique (ancien format local)
  // Valide avec le schema existant demeterBackupSchema
  return storage.importBackup(rawData);
}

function isEncryptedBackup(data: unknown): data is EncryptedExportFormat {
  return (
    typeof data === 'object' &&
    data !== null &&
    'encrypted' in data &&
    (data as { encrypted: boolean }).encrypted === true
  );
}
```

### Export avec option de chiffrement

```typescript
/**
 * Export au nouveau format (optionnellement chiffré)
 */
async function exportBackup(options?: {
  encrypt?: boolean;
  recoveryKey?: string;
}): Promise<DemeterBackup | EncryptedExportFormat> {
  const backup = storage.exportAll();
  
  if (options?.encrypt && options.recoveryKey) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(options.recoveryKey, salt);
    const encrypted = await encrypt(backup, key, salt);
    
    return {
      encrypted: true,
      format: 'demeter-encrypted-v1',
      ...encrypted,
      // Convertir en base64 pour JSON
      ciphertext: arrayBufferToBase64(encrypted.ciphertext),
      iv: arrayBufferToBase64(encrypted.iv),
      salt: arrayBufferToBase64(encrypted.salt),
    };
  }
  
  return backup;
}
```

---

## API Backend (Hono)

### Routes

```typescript
// server/src/routes/sync.ts

import { Hono } from 'hono';
import { 
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

const sync = new Hono();

// ============= WebAuthn / Passkeys =============

// Initier l'enregistrement d'un passkey
sync.post('/auth/register/options', async (c) => {
  const options = await generateRegistrationOptions({
    rpName: 'Demeter',
    rpID: 'demeter.ndlz.net',
    userID: crypto.randomUUID(),
    userName: 'user', // Pas d'email requis
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
  });
  
  // Stocker challenge temporairement
  await kv.set(`challenge:${options.challenge}`, options, { ex: 300 });
  
  return c.json(options);
});

// Finaliser l'enregistrement
sync.post('/auth/register/verify', async (c) => {
  const { credential, challenge, recoveryKeyEncrypted } = await c.req.json();
  
  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge: challenge,
    expectedOrigin: 'https://demeter.ndlz.net',
    expectedRPID: 'demeter.ndlz.net',
  });
  
  if (!verification.verified) {
    return c.json({ error: 'Verification failed' }, 400);
  }
  
  // Créer user + stocker passkey + clé de récupération chiffrée
  const user = await db.users.create({});
  await db.passkeys.create({
    userId: user.id,
    credentialId: verification.registrationInfo.credentialID,
    publicKey: verification.registrationInfo.credentialPublicKey,
    counter: verification.registrationInfo.counter,
  });
  
  // Stocker la clé de récupération chiffrée (wrappée par le passkey)
  await db.recoveryKeys.create({
    userId: user.id,
    encryptedKey: recoveryKeyEncrypted,
  });
  
  // Générer session token
  const token = generateSessionToken(user.id);
  
  return c.json({ 
    success: true, 
    userId: user.id,
    token,
  });
});

// Login avec passkey
sync.post('/auth/login/options', async (c) => {
  const options = await generateAuthenticationOptions({
    rpID: 'demeter.ndlz.net',
    userVerification: 'required',
  });
  
  await kv.set(`challenge:${options.challenge}`, true, { ex: 300 });
  
  return c.json(options);
});

sync.post('/auth/login/verify', async (c) => {
  const { credential, challenge } = await c.req.json();
  
  const passkey = await db.passkeys.findByCredentialId(credential.id);
  if (!passkey) {
    return c.json({ error: 'Passkey not found' }, 404);
  }
  
  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge: challenge,
    expectedOrigin: 'https://demeter.ndlz.net',
    expectedRPID: 'demeter.ndlz.net',
    authenticator: {
      credentialID: passkey.credentialId,
      credentialPublicKey: passkey.publicKey,
      counter: passkey.counter,
    },
  });
  
  if (!verification.verified) {
    return c.json({ error: 'Verification failed' }, 400);
  }
  
  // Mettre à jour counter (anti-replay)
  await db.passkeys.updateCounter(passkey.id, verification.authenticationInfo.newCounter);
  
  // Récupérer clé de récupération chiffrée
  const recoveryKey = await db.recoveryKeys.findByUserId(passkey.userId);
  
  const token = generateSessionToken(passkey.userId);
  
  return c.json({
    success: true,
    userId: passkey.userId,
    token,
    recoveryKeyEncrypted: recoveryKey?.encryptedKey,
  });
});

// ============= Sync =============

// Récupérer le blob chiffré
sync.get('/sync/blob', authMiddleware, async (c) => {
  const userId = c.get('userId');
  
  const blob = await db.encryptedBlobs.findCurrent(userId);
  
  if (!blob) {
    return c.json({ exists: false });
  }
  
  return c.json({
    exists: true,
    ciphertext: blob.ciphertext.toString('base64'),
    iv: blob.iv.toString('base64'),
    salt: blob.salt.toString('base64'),
    version: blob.version,
    schemaVersion: blob.schemaVersion,
    updatedAt: blob.createdAt,
  });
});

// Upload un nouveau blob
sync.put('/sync/blob', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const { ciphertext, iv, salt, version, schemaVersion, expectedVersion } = await c.req.json();
  
  // Vérification de conflit (optimistic locking)
  const current = await db.encryptedBlobs.findCurrent(userId);
  if (current && expectedVersion !== undefined && current.version !== expectedVersion) {
    return c.json({ 
      error: 'Conflict', 
      serverVersion: current.version,
      message: 'Remote data has changed. Please pull before pushing.',
    }, 409);
  }
  
  // Marquer l'ancien comme non-current
  if (current) {
    await db.encryptedBlobs.markNotCurrent(current.id);
  }
  
  // Insérer le nouveau
  const newBlob = await db.encryptedBlobs.create({
    userId,
    ciphertext: Buffer.from(ciphertext, 'base64'),
    iv: Buffer.from(iv, 'base64'),
    salt: Buffer.from(salt, 'base64'),
    version,
    schemaVersion,
    isCurrent: true,
  });
  
  // Cleanup : garder seulement les 5 dernières versions
  await db.encryptedBlobs.pruneOld(userId, 5);
  
  return c.json({ success: true, version: newBlob.version });
});

// Récupération avec clé manuelle
sync.post('/sync/recover', async (c) => {
  const { recoveryKeyDisplay } = await c.req.json();
  
  // L'utilisateur entre sa clé de récupération
  // On ne peut pas vérifier côté serveur (le serveur n'a pas la clé en clair)
  // Le client télécharge le blob et tente de le déchiffrer
  
  // Pour trouver le bon user, on pourrait :
  // 1. Stocker un hash de la clé (mais ça réduit la sécurité)
  // 2. Demander un "user hint" (email optionnel, device name)
  // 3. Essayer de déchiffrer avec tous les blobs (pas scalable)
  
  // Solution recommandée : stocker un identifiant dérivé non-réversible
  const keyHash = await hashRecoveryKeyIdentifier(recoveryKeyDisplay);
  const user = await db.users.findByRecoveryKeyHash(keyHash);
  
  if (!user) {
    return c.json({ error: 'Recovery key not found' }, 404);
  }
  
  const blob = await db.encryptedBlobs.findCurrent(user.id);
  
  return c.json({
    userId: user.id,
    blob: blob ? {
      ciphertext: blob.ciphertext.toString('base64'),
      iv: blob.iv.toString('base64'),
      salt: blob.salt.toString('base64'),
      version: blob.version,
    } : null,
  });
});

export default sync;
```

---

## UX Flow

### Premier lancement (nouveau user)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Welcome to Demeter                                             │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                          │   │
│   │  🔐 Create Account with Passkey                         │   │
│   │                                                          │   │
│   │  Your data will be encrypted end-to-end.                │   │
│   │  Only you can read it.                                   │   │
│   │                                                          │   │
│   │  [ Create Account ]                                      │   │
│   │                                                          │   │
│   │  ─────────────── or ───────────────                     │   │
│   │                                                          │   │
│   │  [ Continue without sync ]  (local only)                │   │
│   │                                                          │   │
│   │  [ Restore from backup ]                                │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                              │
                              ▼ (Create Account)

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   🔑 Save Your Recovery Key                                     │
│                                                                  │
│   If you lose access to your passkey, you'll need this          │
│   key to recover your data.                                      │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                          │   │
│   │   ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-6789               │   │
│   │                                                          │   │
│   │   [ Copy ]  [ Download as file ]                        │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ⚠️  This key is shown only once. Store it safely.             │
│                                                                  │
│   [ ] I have saved my recovery key                              │
│                                                                  │
│   [ Continue ]                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Connexion sur nouvel appareil

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Welcome back                                                   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                          │   │
│   │  🔐 Sign in with Passkey                                │   │
│   │                                                          │   │
│   │  [ Sign In ]                                             │   │
│   │                                                          │   │
│   │  ─────────────── or ───────────────                     │   │
│   │                                                          │   │
│   │  [ Use Recovery Key ]                                    │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Sync indicator (header)

```
┌──────────────────────────────────────────────────────────────────┐
│  Demeter                          🔄 Synced 2 min ago  │ ⚙️     │
└──────────────────────────────────────────────────────────────────┘

États possibles :
- ✅ Synced 2 min ago
- 🔄 Syncing...
- ⚠️ Sync conflict (click to resolve)
- ❌ Sync error (click to retry)
- 📴 Offline (changes will sync when online)
```

---

## Gestion des conflits

### Stratégie : Last-Write-Wins avec avertissement

```typescript
async function syncWithConflictResolution(): Promise<SyncResult> {
  const local = storage.exportAll();
  const localVersion = getSyncState().localVersion;
  
  // 1. Fetch remote
  const remote = await api.getBlob();
  
  // 2. Si pas de remote, push direct
  if (!remote.exists) {
    await pushToRemote(local);
    return { status: 'pushed' };
  }
  
  // 3. Si versions identiques, rien à faire
  if (remote.version === localVersion) {
    return { status: 'in-sync' };
  }
  
  // 4. Si local plus récent, push
  if (localVersion > remote.version) {
    await pushToRemote(local, remote.version);
    return { status: 'pushed' };
  }
  
  // 5. Conflit : remote plus récent
  // Option A : Auto-merge si possible
  // Option B : Demander à l'utilisateur
  
  const merged = attemptAutoMerge(local, await decryptBlob(remote));
  
  if (merged.success) {
    await pushToRemote(merged.data, remote.version);
    storage.importBackup(merged.data);
    return { status: 'merged' };
  }
  
  // Conflit non résolvable automatiquement
  return {
    status: 'conflict',
    local,
    remote: await decryptBlob(remote),
    options: ['keep-local', 'keep-remote', 'manual-merge'],
  };
}
```

---

## Migration depuis local-only

### Pour les utilisateurs existants

```typescript
// Proposé au premier lancement après mise à jour

async function offerCloudMigration(): Promise<void> {
  const hasLocalData = storage.exportAll().data.invoices.length > 0;
  
  if (!hasLocalData) return;
  
  const choice = await showDialog({
    title: 'Enable Cloud Sync?',
    message: `
      You have ${stats.invoices} invoices and ${stats.expenses} expenses stored locally.
      
      Would you like to enable encrypted cloud sync?
      Your data will be encrypted before leaving this device.
    `,
    options: [
      { id: 'enable', label: 'Enable Cloud Sync', primary: true },
      { id: 'later', label: 'Maybe Later' },
      { id: 'never', label: "Don't ask again" },
    ],
  });
  
  if (choice === 'enable') {
    await startOnboarding();
  } else if (choice === 'never') {
    storage.set('cloudSyncDismissed', true);
  }
}
```

---

## Sécurité

### Garanties

| Propriété | Garantie |
|-----------|----------|
| **Confidentialité** | Le serveur ne peut pas lire les données (AES-256-GCM) |
| **Intégrité** | GCM mode détecte toute modification |
| **Authenticité** | Passkey vérifie l'identité |
| **Forward secrecy** | Nouveau salt à chaque sync |
| **Récupération** | Possible avec clé de récupération |

### Ce que le serveur voit

- ✅ Taille approximative des données
- ✅ Fréquence de sync
- ✅ Timestamps
- ❌ Contenu des données
- ❌ Noms de clients
- ❌ Montants
- ❌ Wallets crypto

### Audit de sécurité recommandé

Avant mise en production :
1. Audit du code crypto par un expert
2. Pen test de l'API
3. Review des dépendances (npm audit)

---

## Implémentation — Phases

### Phase 1 : Infrastructure (1-2 jours)
- [ ] Setup PostgreSQL schema
- [ ] API Hono : routes auth + sync
- [ ] Déploiement sur Coolify

### Phase 2 : Crypto client (2-3 jours)
- [ ] Module `src/utils/crypto.ts`
- [ ] Génération clé de récupération
- [ ] Tests unitaires chiffrement/déchiffrement

### Phase 3 : Passkeys (2 jours)
- [ ] Intégration @simplewebauthn/browser
- [ ] UI inscription/connexion
- [ ] Wrapping clé de récupération

### Phase 4 : Sync Manager (2-3 jours)
- [ ] Hook `useSyncManager`
- [ ] Auto-sync en background
- [ ] Gestion conflits
- [ ] Offline queue

### Phase 5 : UI/UX (1-2 jours)
- [ ] Onboarding flow
- [ ] Sync indicator
- [ ] Page Settings > Cloud Sync
- [ ] Recovery flow

### Phase 6 : Migration & Tests (1-2 jours)
- [ ] Migration users existants
- [ ] Tests E2E
- [ ] Documentation

**Total estimé : 10-14 jours**

---

## Questions ouvertes

1. **Multi-device simultané** : Faut-il supporter l'édition simultanée sur plusieurs appareils ? (Complexifie beaucoup avec CRDTs)

2. **Versioning des données** : Garder un historique des versions côté serveur ? (Undo/restore)

3. **Partage** : Permettre de partager des données avec un comptable ? (Nécessite un autre layer de chiffrement)

4. **Backup serveur** : Le serveur doit-il faire des backups des blobs chiffrés ? (Oui pour disaster recovery, mais l'utilisateur doit comprendre que sans sa clé, c'est irrécupérable)

---

## Références

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [WebAuthn Guide](https://webauthn.guide/)
- [@simplewebauthn](https://simplewebauthn.dev/)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Signal Protocol](https://signal.org/docs/) (inspiration pour E2EE)
