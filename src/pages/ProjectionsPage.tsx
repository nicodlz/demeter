import { useProjectionsPage } from '@/hooks/useProjectionsPage';
import { DEFAULT_RETURNS, formatPercent } from '@/utils/projections';
import type { AssetClass } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { ProjectionChart } from '@/components/projections/ProjectionChart';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, Target, Wallet, RotateCcw, ArrowRight } from 'lucide-react';

const ASSET_LABELS: Record<AssetClass, string> = {
  stocks: 'Stocks',
  crypto: 'Crypto',
  cash: 'Cash',
  stablecoins: 'Stablecoins',
};

const ASSET_COLORS: Record<AssetClass, string> = {
  stocks: 'bg-blue-500',
  crypto: 'bg-amber-500',
  cash: 'bg-emerald-500',
  stablecoins: 'bg-violet-500',
};

export const ProjectionsPage = () => {
  const {
    currency,
    stats,
    hasPortfolio,
    portfolioAllocation,
    portfolioReturn,
    contributionAllocationNumbers,
    contributionReturn,
    blendedReturn,
    customReturns,
    contributionAllocation,
    setContributionAllocation,
    principal,
    setPrincipal,
    monthlyContribution,
    setMonthlyContribution,
    years,
    setYears,
    targetAmount,
    setTargetAmount,
    projection,
    yearsToTarget,
    handleUseCurrentNetWorth,
    handleResetReturns,
    handleReturnChange,
  } = useProjectionsPage();

  const { mask } = usePrivacyMode();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Projections</h2>
        <p className="text-muted-foreground">
          Compound interest calculator based on your portfolio
        </p>
      </div>

      {/* Expected Returns */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="text-sm font-medium text-muted-foreground w-full sm:w-auto">Expected returns:</span>
            {(Object.keys(DEFAULT_RETURNS) as AssetClass[]).map((asset) => (
              <div key={asset} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${ASSET_COLORS[asset]}`} />
                <span className="text-sm">{ASSET_LABELS[asset]}</span>
                <Input
                  type="number"
                  step="0.1"
                  min="-50"
                  max="100"
                  value={customReturns[asset]}
                  onChange={(e) => handleReturnChange(asset, e.target.value)}
                  className="w-16 h-7 text-sm"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={handleResetReturns} className="h-7">
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio & Contribution Allocation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Portfolio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Current Portfolio
            </CardTitle>
            <CardDescription>
              {hasPortfolio
                ? `Based on your latest snapshot (${mask(formatCurrency(stats.totalNetWorth, 'USD'))})`
                : 'No snapshot yet - add one to see your allocation'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Allocation bar */}
            <div className="h-4 rounded-full overflow-hidden flex bg-muted">
              {hasPortfolio ? (
                (Object.keys(portfolioAllocation) as AssetClass[]).map((asset) => (
                  <div
                    key={asset}
                    className={`${ASSET_COLORS[asset]} transition-all`}
                    // style kept: width is a runtime-computed percentage from portfolio data;
                    // Tailwind arbitrary values (e.g. w-[X%]) require build-time constants
                    // and cannot be used with dynamic runtime values.
                    style={{ width: `${portfolioAllocation[asset]}%` }}
                  />
                ))
              ) : (
                <div className="w-full bg-muted" />
              )}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(Object.keys(portfolioAllocation) as AssetClass[]).map((asset) => (
                <div key={asset} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${ASSET_COLORS[asset]}`} />
                    <span>{ASSET_LABELS[asset]}</span>
                  </div>
                  <span className="font-medium">{portfolioAllocation[asset].toFixed(1)}%</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t text-sm">
              Weighted return: <strong className="text-primary">{formatPercent(portfolioReturn)}</strong>
            </div>
          </CardContent>
        </Card>

        {/* Contribution Allocation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Monthly Contribution Allocation
            </CardTitle>
            <CardDescription>
              How your monthly contributions will be invested
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Allocation bar */}
            <div className="h-4 rounded-full overflow-hidden flex">
              {(Object.keys(contributionAllocationNumbers) as AssetClass[]).map((asset) => (
                <div
                  key={asset}
                  className={`${ASSET_COLORS[asset]} transition-all`}
                  // style kept: width is a runtime-computed percentage from the contribution
                  // allocation slider; Tailwind arbitrary values require build-time constants.
                  style={{ width: `${contributionAllocationNumbers[asset]}%` }}
                />
              ))}
            </div>

            {/* Risk slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Safe (Cash/Stables)</span>
                <span className="text-muted-foreground">Risky (Stocks/Crypto)</span>
              </div>
              <Slider
                value={[contributionAllocation.riskVsSafe]}
                onValueChange={(v) => setContributionAllocation(prev => ({ ...prev, riskVsSafe: v[0] }))}
                max={100}
                step={5}
              />
              <div className="text-center text-sm font-medium">
                {100 - contributionAllocation.riskVsSafe}% Safe / {contributionAllocation.riskVsSafe}% Risky
              </div>
            </div>

            {/* Stocks vs Crypto slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-500">Stocks</span>
                <span className="text-amber-500">Crypto</span>
              </div>
              <Slider
                value={[contributionAllocation.stocksVsCrypto]}
                onValueChange={(v) => setContributionAllocation(prev => ({ ...prev, stocksVsCrypto: v[0] }))}
                max={100}
                step={5}
              />
            </div>

            <div className="pt-2 border-t text-sm">
              Weighted return: <strong className="text-primary">{formatPercent(contributionReturn)}</strong>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculator
            </CardTitle>
            <CardDescription>
              Blended return: {formatPercent(blendedReturn)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="principal">Initial Capital</Label>
              <div className="flex gap-2">
                <Input
                  id="principal"
                  type="number"
                  min="0"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                />
                {stats.totalNetWorth > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUseCurrentNetWorth}
                    title="Use current net worth"
                  >
                    <Wallet className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="monthly">Monthly Contribution</Label>
              <Input
                id="monthly"
                type="number"
                min="0"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="years">Time Horizon (years)</Label>
              <Input
                id="years"
                type="number"
                min="1"
                max="50"
                value={years}
                onChange={(e) => setYears(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="target">Target Amount (optional)</Label>
              <Input
                id="target"
                type="number"
                min="0"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
              {yearsToTarget && (
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  Reach {formatCurrency(parseFloat(targetAmount), currency)} in{' '}
                  <strong>{yearsToTarget} years</strong>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Projection Results
            </CardTitle>
            <CardDescription>
              At {formatPercent(blendedReturn)} blended annual return over {years} years
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projection ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 sm:p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Final Value</p>
                    <p className="text-xl sm:text-2xl font-bold text-primary">
                      {formatCurrency(projection.finalValue, currency)}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Total Contributed</p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {formatCurrency(projection.totalContributed, currency)}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Total Gains</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      {formatCurrency(projection.totalGains, currency)}
                    </p>
                    <Badge variant="secondary" className="mt-1">
                      {((projection.totalGains / projection.totalContributed) * 100).toFixed(0)}% return
                    </Badge>
                  </div>
                </div>

                {/* Chart */}
                <ProjectionChart data={projection.projectionByYear} currency={currency} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Enter valid parameters to see projection
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Yearly Breakdown Table */}
      {projection && (
        <Card>
          <CardHeader>
            <CardTitle>Yearly Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Contributed</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Total Gains</TableHead>
                  <TableHead className="text-right">Yearly Gains</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projection.projectionByYear
                  .filter((_, i) => i < 10 || i === projection.projectionByYear.length - 1 || (i + 1) % 5 === 0)
                  .map((row) => (
                    <TableRow key={row.year}>
                      <TableCell className="font-medium">Year {row.year}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(row.totalValue, currency)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                        {formatCurrency(row.totalContributed, currency)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 hidden sm:table-cell whitespace-nowrap">
                        {formatCurrency(row.totalGains, currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.yearlyGains, currency)}
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
