import { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useIbkr } from '@/hooks/useIbkr';
import { formatCurrency } from '@/utils/formatters';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  KeyRound,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Landmark,
  BarChart3,
} from 'lucide-react';

const ASSET_CATEGORY_LABELS: Record<string, string> = {
  STK: 'Stocks',
  OPT: 'Options',
  FUT: 'Futures',
  CASH: 'Cash',
  BOND: 'Bonds',
  WAR: 'Warrants',
  FUND: 'Funds',
  OTHER: 'Other',
};

function formatAssetCategory(cat: string): string {
  return ASSET_CATEGORY_LABELS[cat] ?? cat;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export const IbkrPage = () => {
  const {
    positions,
    cashBalances,
    lastSyncAt,
    syncing,
    accountId,
    nav,
    isConfigured,
    syncIbkr,
    totalPositionValue,
    totalCashValue,
    totalUnrealizedPnl,
    totalCostBasis,
    assetCategories,
    currencies,
  } = useIbkr();

  const [syncError, setSyncError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');

  const handleSync = async () => {
    setSyncError(null);
    const result = await syncIbkr();
    if (!result.success && result.error) {
      setSyncError(result.error);
    }
  };

  const filteredPositions = useMemo(() => {
    return positions.filter((p) => {
      if (filterCategory !== 'all' && p.assetCategory !== filterCategory) return false;
      if (filterCurrency !== 'all' && p.currency !== filterCurrency) return false;
      return true;
    });
  }, [positions, filterCategory, filterCurrency]);

  const sortedPositions = useMemo(() => {
    return [...filteredPositions].sort((a, b) => Math.abs(b.marketValue) - Math.abs(a.marketValue));
  }, [filteredPositions]);

  const totalPnlPercent =
    totalCostBasis > 0 ? (totalUnrealizedPnl / totalCostBasis) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            IBKR Portfolio
            {accountId && (
              <span className="text-muted-foreground font-normal text-sm sm:text-base ml-2">
                — {accountId}
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            Interactive Brokers positions via Flex Web Service
          </p>
        </div>
        {isConfigured && positions.length > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            {lastSyncAt && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Last sync: {new Date(lastSyncAt).toLocaleString()}
              </span>
            )}
            <Button onClick={handleSync} disabled={syncing} size="sm" className="min-h-[44px] sm:min-h-0">
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync'}
            </Button>
          </div>
        )}
      </div>

      {/* Not configured warning */}
      {!isConfigured && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <KeyRound className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">IBKR Flex Credentials Required</p>
              <p className="text-sm text-muted-foreground mt-1">
                To sync your IBKR portfolio, configure your Flex Token and Query ID in{' '}
                <Link to="/configuration" className="underline text-foreground hover:text-foreground/80">
                  Configuration
                </Link>
                . You can obtain them from the IBKR Client Portal under{' '}
                <em>Performance &amp; Reports → Flex Queries</em>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Initial sync prompt */}
      {isConfigured && positions.length === 0 && !syncing && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Landmark className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No positions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sync your IBKR portfolio to see your positions here.
              </p>
            </div>
            <Button onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Now'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sync errors */}
      {syncError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Sync Error</p>
              <p className="text-sm text-muted-foreground mt-1">{syncError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      {positions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">
                {formatCurrency(nav ?? totalPositionValue + totalCashValue, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground">
                {positions.length} position{positions.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">
                {formatCurrency(totalCashValue, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground">
                {cashBalances.length} currenc{cashBalances.length !== 1 ? 'ies' : 'y'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-lg sm:text-2xl font-bold ${
                  totalUnrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {totalUnrealizedPnl >= 0 ? '+' : ''}
                {formatCurrency(totalUnrealizedPnl, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalPnlPercent >= 0 ? '+' : ''}
                {totalPnlPercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Positions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">{positions.length}</div>
              <p className="text-xs text-muted-foreground">
                {assetCategories.length} asset type{assetCategories.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cash Balances */}
      {cashBalances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cash Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cashBalances.map((cb) => (
                <div key={cb.currency} className="p-3 bg-muted rounded-lg text-center">
                  <div className="text-sm font-medium text-muted-foreground">
                    {cb.currency}
                  </div>
                  <div className="text-lg font-bold">{formatNumber(cb.endingCash)}</div>
                  {cb.endingSettledCash !== cb.endingCash && (
                    <div className="text-xs text-muted-foreground">
                      Settled: {formatNumber(cb.endingSettledCash)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Positions table */}
      {positions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Positions</CardTitle>
                <CardDescription>
                  {filteredPositions.length} of {positions.length} positions
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Asset Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {assetCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {formatAssetCategory(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All CCY</SelectItem>
                    {currencies.map((ccy) => (
                      <SelectItem key={ccy} value={ccy}>
                        {ccy}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Qty</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Cost</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">% NAV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPositions.map((pos) => (
                  <TableRow key={`${pos.conid}-${pos.currency}`}>
                    <TableCell>
                      <div className="font-medium">{pos.symbol}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {pos.description}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded bg-muted">
                        {formatAssetCategory(pos.assetCategory)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono hidden sm:table-cell">
                      {formatNumber(pos.quantity)}
                    </TableCell>
                    <TableCell className="text-right font-mono hidden lg:table-cell">
                      {formatNumber(pos.markPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono whitespace-nowrap">
                      {formatNumber(pos.marketValue)}
                    </TableCell>
                    <TableCell className="text-right font-mono hidden lg:table-cell">
                      {formatNumber(pos.costBasisMoney)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${
                        pos.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {pos.unrealizedPnl >= 0 ? '+' : ''}
                      {formatNumber(pos.unrealizedPnl)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground hidden sm:table-cell">
                      {pos.percentOfNav.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
