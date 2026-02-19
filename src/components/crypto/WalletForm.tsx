import { useState, useEffect } from 'react';
import type { CryptoWallet } from '@/schemas';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WalletFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet?: CryptoWallet | null;
  onSubmit: (data: { label: string; address: string; type: 'evm' | 'bitcoin' }) => void;
}

export const WalletForm = ({ open, onOpenChange, wallet, onSubmit }: WalletFormProps) => {
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [walletType, setWalletType] = useState<'evm' | 'bitcoin'>('evm');

  useEffect(() => {
    if (wallet) {
      setLabel(wallet.label);
      setAddress(wallet.address);
      setWalletType(wallet.type || 'evm');
    } else {
      setLabel('');
      setAddress('');
      setWalletType('evm');
    }
  }, [wallet, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !address.trim()) return;
    onSubmit({ label: label.trim(), address: address.trim(), type: walletType });
    onOpenChange(false);
  };

  const isValidAddress = (addr: string, type: 'evm' | 'bitcoin'): boolean => {
    if (!addr) return false;
    
    if (type === 'bitcoin') {
      // Bitcoin addresses (Legacy P2PKH, P2SH, Bech32, Bech32m)
      // Legacy: starts with 1, 26-35 chars
      if (/^1[a-zA-HJ-NP-Z0-9]{25,34}$/.test(addr)) return true;
      // P2SH: starts with 3, 26-35 chars
      if (/^3[a-zA-HJ-NP-Z0-9]{25,34}$/.test(addr)) return true;
      // Bech32 (SegWit): starts with bc1, lowercase
      if (/^bc1[a-z0-9]{39,59}$/.test(addr)) return true;
      return false;
    }
    
    // EVM address: 0x + 40 hex chars
    if (/^0x[a-fA-F0-9]{40}$/.test(addr)) return true;
    // Solana address: base58, 32-44 chars
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) return true;
    return false;
  };

  const addressValid = isValidAddress(address.trim(), walletType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{wallet ? 'Edit Wallet' : 'Add Wallet'}</DialogTitle>
            <DialogDescription>
              Enter the wallet label, type, and address.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="wallet-type">Wallet Type</Label>
              <Select value={walletType} onValueChange={(v: 'evm' | 'bitcoin') => setWalletType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select wallet type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evm">EVM (Ethereum, Polygon, etc.)</SelectItem>
                  <SelectItem value="bitcoin">Bitcoin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-label">Label</Label>
              <Input
                id="wallet-label"
                placeholder={walletType === 'bitcoin' ? 'e.g. Hardware Wallet, Binance...' : 'e.g. MetaMask, Ledger...'}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-address">Address</Label>
              <Input
                id="wallet-address"
                placeholder={walletType === 'bitcoin' ? '1..., 3..., or bc1...' : '0x... or Solana address'}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="font-mono text-sm"
                required
              />
              {address.trim() && !addressValid && (
                <p className="text-xs text-destructive">
                  {walletType === 'bitcoin' 
                    ? 'Invalid Bitcoin address. Use Legacy (1...), P2SH (3...), or SegWit (bc1...).'
                    : 'Invalid address format. Enter an EVM (0x...) or Solana address.'}
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
