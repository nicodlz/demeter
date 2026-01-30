import { useState, useMemo } from 'react';
import type { TokenPosition, CryptoWallet } from '@/types';
import { formatCurrency } from '@/utils/formatters';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TokenTableProps {
  positions: TokenPosition[];
  wallets: CryptoWallet[];
  chains: string[];
}

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K`;
  if (amount >= 1) return amount.toFixed(4);
  if (amount >= 0.0001) return amount.toFixed(6);
  return amount.toExponential(2);
}

function positionTypeBadgeVariant(type: TokenPosition['positionType']): 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'wallet':
      return 'default';
    case 'deposit':
    case 'staked':
    case 'locked':
      return 'secondary';
    default:
      return 'outline';
  }
}

export const TokenTable = ({ positions, wallets, chains }: TokenTableProps) => {
  const [filterChain, setFilterChain] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterWallet, setFilterWallet] = useState<string>('all');

  const walletMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of wallets) {
      map.set(w.id, w.label);
    }
    return map;
  }, [wallets]);

  const filteredPositions = useMemo(() => {
    let result = positions;
    if (filterChain !== 'all') {
      result = result.filter((p) => p.chain === filterChain);
    }
    if (filterType !== 'all') {
      if (filterType === 'stablecoin') {
        result = result.filter((p) => p.isStablecoin);
      } else if (filterType === 'crypto') {
        result = result.filter((p) => !p.isStablecoin);
      } else {
        result = result.filter((p) => p.positionType === filterType);
      }
    }
    if (filterWallet !== 'all') {
      result = result.filter((p) => p.walletId === filterWallet);
    }
    // Sort by USD value descending
    return [...result].sort((a, b) => b.usdValue - a.usdValue);
  }, [positions, filterChain, filterType, filterWallet]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Positions</CardTitle>
            <CardDescription>
              {filteredPositions.length} of {positions.length} positions
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={filterChain} onValueChange={setFilterChain}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Chain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chains</SelectItem>
                {chains.map((chain) => (
                  <SelectItem key={chain} value={chain}>
                    {chain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="crypto">Crypto Only</SelectItem>
                <SelectItem value="stablecoin">Stablecoins</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="staked">Staked</SelectItem>
                <SelectItem value="reward">Reward</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
                <SelectItem value="liquidity">Liquidity</SelectItem>
              </SelectContent>
            </Select>

            {wallets.length > 1 && (
              <Select value={filterWallet} onValueChange={setFilterWallet}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Wallet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wallets</SelectItem>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPositions.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            {positions.length === 0
              ? 'No positions yet. Sync your wallets to see token data.'
              : 'No positions match the current filters.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Wallet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.map((pos) => (
                  <TableRow key={pos.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {pos.iconUrl && (
                          <img
                            src={pos.iconUrl}
                            alt={pos.symbol}
                            className="h-5 w-5 rounded-full"
                            loading="lazy"
                          />
                        )}
                        <div>
                          <span className="font-medium">{pos.symbol}</span>
                          {pos.isStablecoin && (
                            <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0">
                              stable
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {pos.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatAmount(pos.amount)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(pos.usdValue, 'USD')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {pos.chain}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={positionTypeBadgeVariant(pos.positionType)} className="text-xs">
                        {pos.positionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {pos.protocol || '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {walletMap.get(pos.walletId) || '?'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
