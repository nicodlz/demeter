import { useState, useRef } from 'react';
import type { CryptoWallet } from '@/schemas';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Plus, Wallet, Upload } from 'lucide-react';
import { WalletForm } from './WalletForm';

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface WalletListProps {
  wallets: CryptoWallet[];
  onAdd: (data: { label: string; address: string; type: 'evm' | 'bitcoin' }) => void;
  onEdit: (id: string, data: { label: string; address: string; type: 'evm' | 'bitcoin' }) => void;
  onDelete: (id: string) => void;
}

export const WalletList = ({ wallets, onAdd, onEdit, onDelete }: WalletListProps) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<CryptoWallet | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenAdd = () => {
    setEditingWallet(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (wallet: CryptoWallet) => {
    setEditingWallet(wallet);
    setFormOpen(true);
  };

  const handleSubmit = (data: { label: string; address: string; type: 'evm' | 'bitcoin' }) => {
    if (editingWallet) {
      onEdit(editingWallet.id, data);
    } else {
      onAdd(data);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.trim().split('\n');

      // Skip header line
      const dataLines = lines.slice(1);

      let imported = 0;
      let skipped = 0;

      for (const line of dataLines) {
        const [address, label, type] = line.split(',').map(s => s.trim());

        if (!address || !label) {
          skipped++;
          continue;
        }

        // Check if wallet already exists
        const exists = wallets.some(w => w.address.toLowerCase() === address.toLowerCase());
        if (exists) {
          skipped++;
          continue;
        }

        // Default to 'evm' if type not specified or invalid
        const walletType = (type === 'bitcoin' || type === 'evm') ? type : 'evm';

        onAdd({ address, label, type: walletType });
        imported++;
      }

      setImportStatus({
        type: 'success',
        message: `Imported ${imported} wallet(s)${skipped > 0 ? `, skipped ${skipped} duplicate(s)` : ''}`
      });

      setTimeout(() => setImportStatus(null), 5000);
    } catch (error) {
      setImportStatus({
        type: 'error',
        message: `Failed to import CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      setTimeout(() => setImportStatus(null), 5000);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Wallets</CardTitle>
            <CardDescription>
              {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} tracked
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleImportClick}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button size="sm" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Wallet
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Import status */}
          {importStatus && (
            <div
              className={`p-3 rounded-md text-sm ${
                importStatus.type === 'success'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}
            >
              {importStatus.message}
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {wallets.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">
                No wallets configured yet. Add a wallet to start tracking your crypto.
              </p>
              <Button variant="outline" onClick={handleOpenAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Wallet
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{wallet.label}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        wallet.type === 'bitcoin' 
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {wallet.type === 'bitcoin' ? 'BTC' : 'EVM'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {truncateAddress(wallet.address)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenEdit(wallet)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Wallet</AlertDialogTitle>
                          <AlertDialogDescription>
                            Remove "{wallet.label}" ({truncateAddress(wallet.address)})? Positions from this wallet will also be removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(wallet.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <WalletForm
        open={formOpen}
        onOpenChange={setFormOpen}
        wallet={editingWallet}
        onSubmit={handleSubmit}
      />
    </>
  );
};
