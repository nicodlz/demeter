import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useCrypto } from '@/hooks/useCrypto';
import { CryptoSummaryCards } from '@/components/crypto/CryptoSummaryCards';
import { WalletList } from '@/components/crypto/WalletList';
import { TokenTable } from '@/components/crypto/TokenTable';
import { SyncButton } from '@/components/crypto/SyncButton';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, KeyRound } from 'lucide-react';

export const CryptoPage = () => {
  const {
    wallets,
    positions,
    lastSyncAt,
    syncing,
    zerionApiKey,
    addWallet,
    removeWallet,
    updateWallet,
    syncAllWallets,
    getTotalCryptoValue,
    getTotalStablecoinValue,
    chains,
  } = useCrypto();

  const [syncErrors, setSyncErrors] = useState<string[]>([]);

  const handleSync = async () => {
    setSyncErrors([]);
    const result = await syncAllWallets();
    if (result.errors && result.errors.length > 0) {
      setSyncErrors(result.errors.map((e) => e.error));
    }
  };

  const handleAddWallet = (data: { label: string; address: string }) => {
    addWallet(data);
  };

  const handleEditWallet = (id: string, data: { label: string; address: string }) => {
    updateWallet(id, data);
  };

  const handleDeleteWallet = (id: string) => {
    removeWallet(id);
  };

  const hasApiKey = Boolean(zerionApiKey);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Crypto Portfolio</h2>
          <p className="text-sm text-muted-foreground">
            Track your crypto wallets and DeFi positions
          </p>
        </div>
        {hasApiKey && wallets.length > 0 && (
          <SyncButton
            syncing={syncing}
            lastSyncAt={lastSyncAt}
            onSync={handleSync}
          />
        )}
      </div>

      {/* API Key warning */}
      {!hasApiKey && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <KeyRound className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Zerion API Key Required</p>
              <p className="text-sm text-muted-foreground mt-1">
                To sync wallet positions, you need to configure your Zerion API key in{' '}
                <Link to="/configuration" className="underline text-foreground hover:text-foreground/80">
                  Configuration
                </Link>
                . Get a free key at{' '}
                <a
                  href="https://developers.zerion.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-foreground hover:text-foreground/80"
                >
                  developers.zerion.io
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync errors */}
      {syncErrors.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Sync Errors</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                {syncErrors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      {positions.length > 0 && (
        <CryptoSummaryCards
          totalCryptoValue={getTotalCryptoValue}
          totalStablecoinValue={getTotalStablecoinValue}
          positionCount={positions.length}
          walletCount={wallets.length}
        />
      )}

      {/* Wallet list */}
      <WalletList
        wallets={wallets}
        onAdd={handleAddWallet}
        onEdit={handleEditWallet}
        onDelete={handleDeleteWallet}
      />

      {/* Token table */}
      {positions.length > 0 && (
        <TokenTable
          positions={positions}
          wallets={wallets}
          chains={chains}
        />
      )}
    </div>
  );
};
