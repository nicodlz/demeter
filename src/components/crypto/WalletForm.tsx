import { useState, useEffect } from 'react';
import type { CryptoWallet } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WalletFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet?: CryptoWallet | null;
  onSubmit: (data: { label: string; address: string }) => void;
}

export const WalletForm = ({ open, onOpenChange, wallet, onSubmit }: WalletFormProps) => {
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (wallet) {
      setLabel(wallet.label);
      setAddress(wallet.address);
    } else {
      setLabel('');
      setAddress('');
    }
  }, [wallet, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !address.trim()) return;
    onSubmit({ label: label.trim(), address: address.trim() });
    onOpenChange(false);
  };

  const isValidAddress = (addr: string): boolean => {
    if (!addr) return false;
    // EVM address: 0x + 40 hex chars
    if (/^0x[a-fA-F0-9]{40}$/.test(addr)) return true;
    // Solana address: base58, 32-44 chars
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) return true;
    return false;
  };

  const addressValid = isValidAddress(address.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{wallet ? 'Edit Wallet' : 'Add Wallet'}</DialogTitle>
            <DialogDescription>
              Enter the wallet label and address (EVM or Solana).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="wallet-label">Label</Label>
              <Input
                id="wallet-label"
                placeholder="e.g. MetaMask, Ledger, Phantom..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-address">Address</Label>
              <Input
                id="wallet-address"
                placeholder="0x... or Solana address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="font-mono text-sm"
                required
              />
              {address.trim() && !addressValid && (
                <p className="text-xs text-destructive">
                  Invalid address format. Enter an EVM (0x...) or Solana address.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!label.trim() || !addressValid}>
              {wallet ? 'Update' : 'Add'} Wallet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
