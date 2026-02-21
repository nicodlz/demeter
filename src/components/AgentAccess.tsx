/**
 * Agent Access card for Configuration page
 *
 * Creates an API key + displays encryption keys so an AI agent (e.g. OpenClaw)
 * can read/write encrypted vault data via @ursalock/agent SDK.
 *
 * Keys are shown ONCE after generation — user must copy them immediately.
 */

import { useState, useCallback } from "react";
import { Bot, Copy, Check, Loader2, Key, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { vaultClient, SERVER_URL, VAULT_NAME } from "@/lib/vault/client";
import { deriveKeysFromJwk } from "@/lib/vault/keys";
import { useVault } from "@/lib/vault/context";
import { useAuth } from "@ursalock/client";
import { bytesToBase64 } from "@ursalock/crypto";

interface GeneratedKeys {
  apiKey: string;
  apiKeyUid: string;
  vaultUid: string;
  encryptionKey: string;
  hmacKey: string;
  serverUrl: string;
}

interface ExistingKey {
  uid: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  collections: string[] | null;
  createdAt: number;
  revokedAt: number | null;
}

/** Copy text to clipboard with visual feedback */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

/** Readonly field with copy button */
function SecretField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <CopyButton text={value} />
      </div>
    </div>
  );
}

export function AgentAccess() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedKeys | null>(null);
  const [existing, setExisting] = useState<ExistingKey[] | null>(null);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("openclaw");

  const { isReady } = useVault();
  const authState = useAuth(vaultClient);

  const loadExistingKeys = useCallback(async () => {
    setIsLoadingKeys(true);
    try {
      const res = await vaultClient.fetch("/auth/api-keys");
      if (!res.ok) throw new Error(`Failed to list keys: ${res.status}`);
      const data = (await res.json()) as { apiKeys: ExistingKey[] };
      setExisting(data.apiKeys.filter((k) => !k.revokedAt));
    } catch (err) {
      console.warn("[agent-access] Failed to load keys:", err);
    } finally {
      setIsLoadingKeys(false);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!authState.credential) {
      setError("No passkey credential available. Please sign out and sign in again.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // 1. Get vault UID
      const vaultRes = await vaultClient.fetch(`/vault/by-name/${VAULT_NAME}`);
      if (!vaultRes.ok) throw new Error("Vault not found");
      const { uid: vaultUid } = (await vaultRes.json()) as { uid: string };

      // 2. Create API key scoped to this vault + demeter-state collection
      const keyRes = await vaultClient.fetch("/auth/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          permissions: ["read", "write"],
          vaultUids: [vaultUid],
          collections: ["demeter-state"],
        }),
      });
      if (!keyRes.ok) {
        const err = (await keyRes.json()) as { message?: string };
        throw new Error(err.message ?? `Failed to create key: ${keyRes.status}`);
      }
      const keyData = (await keyRes.json()) as { key: string; uid: string };

      // 3. Derive encryption keys from passkey
      const keys = await deriveKeysFromJwk(authState.credential.cipherJwk, vaultUid);

      setGenerated({
        apiKey: keyData.key,
        apiKeyUid: keyData.uid,
        vaultUid,
        encryptionKey: bytesToBase64(keys.encryptionKey),
        hmacKey: bytesToBase64(keys.hmacKey),
        serverUrl: SERVER_URL,
      });

      // Refresh existing keys list
      await loadExistingKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate key");
    } finally {
      setIsGenerating(false);
    }
  }, [authState.credential, name, loadExistingKeys]);

  const handleRevoke = useCallback(async (uid: string) => {
    try {
      const res = await vaultClient.fetch(`/auth/api-keys/${uid}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to revoke: ${res.status}`);
      await loadExistingKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke key");
    }
  }, [loadExistingKeys]);

  // Load existing keys on first render
  if (isReady && existing === null && !isLoadingKeys) {
    void loadExistingKeys();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Agent Access
        </CardTitle>
        <CardDescription>
          Generate an API key for your AI agent (OpenClaw, etc.) to read and write your encrypted data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Existing keys */}
        {existing && existing.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Active keys</Label>
            {existing.map((key) => (
              <div key={key.uid} className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
                <div>
                  <span className="font-medium">{key.name}</span>
                  <span className="text-muted-foreground ml-2 font-mono text-xs">{key.keyPrefix}…</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {new Date(key.createdAt * 1000).toLocaleDateString()}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRevoke(key.uid)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Generated keys (shown once) */}
        {generated ? (
          <div className="space-y-3 p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Copy these now</strong> — the API key and encryption keys won't be shown again.
              </p>
            </div>
            <SecretField label="Server URL" value={SERVER_URL} />
            <SecretField label="API Key" value={generated.apiKey} />
            <SecretField label="Vault UID" value={generated.vaultUid} />
            <SecretField label="Encryption Key (base64)" value={generated.encryptionKey} />
            <SecretField label="HMAC Key (base64)" value={generated.hmacKey} />

            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setGenerated(null)}>
                <Check className="mr-2 h-4 w-4" />
                Done — I've copied the keys
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-3">
            <div className="space-y-1 flex-1">
              <Label htmlFor="agentName" className="text-xs">Key name</Label>
              <Input
                id="agentName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="openclaw"
                className="max-w-[200px]"
              />
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating || !isReady || !name}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Generate Agent Key
                </>
              )}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          🔐 The agent key is scoped to the <code className="bg-muted px-1 rounded">demeter-state</code> collection only.
          Revoke it anytime from this page.
        </p>
      </CardContent>
    </Card>
  );
}
