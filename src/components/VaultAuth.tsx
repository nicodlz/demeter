/**
 * Vault authentication screen for Demeter
 *
 * Branded login page with passkey sign-in/sign-up.
 * Uses the VaultContext for auth actions.
 */

import { useState } from "react";
import { Fingerprint, Loader2, AlertTriangle, ShieldX, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVault } from "@/lib/vault/context";

export function VaultAuth() {
  const { isLoading, error, supportsPasskey, signIn, signUp, clearError } = useVault();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  if (!supportsPasskey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-destructive/10 mb-6">
            <ShieldX className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Passkeys Not Supported</h1>
          <p className="text-muted-foreground mb-6">
            Your browser doesn&apos;t support WebAuthn passkeys.
            Please use a modern browser like Chrome, Firefox, Safari, or Edge.
          </p>
        </div>
      </div>
    );
  }

  const handleAction = mode === "signin" ? signIn : signUp;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
            <Landmark className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Demeter</h1>
          <p className="text-muted-foreground">
            End-to-end encrypted personal finance
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Authentication failed</p>
              <p className="text-xs text-destructive/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Auth card */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">
              {mode === "signin" ? "Welcome back" : "Create your vault"}
            </CardTitle>
            <CardDescription className="text-center">
              {mode === "signin"
                ? "Use your passkey to access your data"
                : "Set up a passkey to secure your finances"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleAction}
              disabled={isLoading}
              className="w-full h-14"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {mode === "signin" ? "Authenticating..." : "Creating vault..."}
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5 mr-2" />
                  {mode === "signin" ? "Sign in with Passkey" : "Create Passkey"}
                </>
              )}
            </Button>

            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                {mode === "signin" ? "Don't have a vault? " : "Already have a vault? "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    clearError();
                  }}
                  className="text-primary hover:underline"
                >
                  {mode === "signin" ? "Create one" : "Sign in"}
                </button>
              </p>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              🔐 Your data is encrypted with keys derived from your passkey.
              Same passkey on any device = same data.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
