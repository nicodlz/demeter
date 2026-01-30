import { useState } from 'react';
import type { CryptoWallet } from '@/types';

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
import { Pencil, Trash2, Plus, Wallet } from 'lucide-react';
import { WalletForm } from './WalletForm';

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface WalletListProps {
  wallets: CryptoWallet[];
  onAdd: (data: { label: string; address: string }) => void;
  onEdit: (id: string, data: { label: string; address: string }) => void;
  onDelete: (id: string) => void;
}

export const WalletList = ({ wallets, onAdd, onEdit, onDelete }: WalletListProps) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<CryptoWallet | null>(null);

  const handleOpenAdd = () => {
    setEditingWallet(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (wallet: CryptoWallet) => {
    setEditingWallet(wallet);
    setFormOpen(true);
  };

  const handleSubmit = (data: { label: string; address: string }) => {
    if (editingWallet) {
      onEdit(editingWallet.id, data);
    } else {
      onAdd(data);
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
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Wallet
          </Button>
        </CardHeader>
        <CardContent>
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
                    <p className="font-medium truncate">{wallet.label}</p>
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
