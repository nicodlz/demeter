import { useState, useMemo, useRef } from 'react';
import { useNetWorthDashboard } from '@/hooks/useNetWorthDashboard';
import { useSettings } from '@/hooks/useSettings';
import {
  calculateCompoundInterest,
  calculateWeightedReturn,
  yearsToReachTarget,
  DEFAULT_RETURNS,
} from '@/utils/projections';
import type { ProjectionResult } from '@/utils/projections';
import type { Currency, AssetClass } from '@/schemas';

export const useProjectionsPage = () => {
  const { settings } = useSettings();
  const stats = useNetWorthDashboard();
  const currency: Currency = settings.dashboardCurrency || 'USD';

  const initializedRef = useRef(false);

  // Custom returns per asset class (stored as percentages for display)
  const [customReturns, setCustomReturns] = useState<Record<AssetClass, string>>({
    stocks: (DEFAULT_RETURNS.stocks * 100).toString(),
    crypto: (DEFAULT_RETURNS.crypto * 100).toString(),
    cash: (DEFAULT_RETURNS.cash * 100).toString(),
    stablecoins: (DEFAULT_RETURNS.stablecoins * 100).toString(),
  });

  // Contribution allocation sliders
  const [contributionAllocation, setContributionAllocation] = useState({
    stocksVsCrypto: 50,
    riskVsSafe: 80,
  });

  // Form state
  const [principal, setPrincipal] = useState<string>('10000');
  const [monthlyContribution, setMonthlyContribution] = useState<string>('2000');
  const [years, setYears] = useState<string>('10');
  const [targetAmount, setTargetAmount] = useState<string>('1000000');

  // Initialize principal from snapshot once
  if (!initializedRef.current && stats.totalNetWorth > 0) {
    initializedRef.current = true;
    setPrincipal(Math.round(stats.totalNetWorth).toString());
  }

  // Get current portfolio allocation from snapshot
  const portfolioAllocation = useMemo(() => {
    const alloc: Record<AssetClass, number> = {
      stocks: 0,
      crypto: 0,
      cash: 0,
      stablecoins: 0,
    };
    if (stats.allocation && stats.allocation.length > 0) {
      stats.allocation.forEach((item) => {
        alloc[item.assetClass] = item.percentage;
      });
    }
    return alloc;
  }, [stats.allocation]);

  // Calculate contribution allocation from sliders
  const contributionAllocationNumbers = useMemo(() => {
    const { stocksVsCrypto, riskVsSafe } = contributionAllocation;
    const riskyPortion = riskVsSafe / 100;
    const safePortion = 1 - riskyPortion;

    const stocksPortion = riskyPortion * ((100 - stocksVsCrypto) / 100);
    const cryptoPortion = riskyPortion * (stocksVsCrypto / 100);

    const cashPortion = safePortion * 0.5;
    const stablecoinsPortion = safePortion * 0.5;

    return {
      stocks: stocksPortion * 100,
      crypto: cryptoPortion * 100,
      cash: cashPortion * 100,
      stablecoins: stablecoinsPortion * 100,
    };
  }, [contributionAllocation]);

  // Convert custom returns to decimal for calculations
  const customReturnsDecimal = useMemo(() => {
    return {
      stocks: (parseFloat(customReturns.stocks) || 0) / 100,
      crypto: (parseFloat(customReturns.crypto) || 0) / 100,
      cash: (parseFloat(customReturns.cash) || 0) / 100,
      stablecoins: (parseFloat(customReturns.stablecoins) || 0) / 100,
    };
  }, [customReturns]);

  // Calculate weighted return for existing portfolio
  const portfolioReturn = useMemo(() => {
    return calculateWeightedReturn(portfolioAllocation, customReturnsDecimal);
  }, [portfolioAllocation, customReturnsDecimal]);

  // Calculate weighted return for contributions
  const contributionReturn = useMemo(() => {
    return calculateWeightedReturn(contributionAllocationNumbers, customReturnsDecimal);
  }, [contributionAllocationNumbers, customReturnsDecimal]);

  // Blended return over time
  const blendedReturn = useMemo(() => {
    const p = parseFloat(principal) || 0;
    const m = parseFloat(monthlyContribution) || 0;
    const y = parseInt(years) || 10;

    const totalContributions = m * 12 * y;
    const estimatedWeight = p / (p + totalContributions);

    return portfolioReturn * estimatedWeight + contributionReturn * (1 - estimatedWeight);
  }, [principal, monthlyContribution, years, portfolioReturn, contributionReturn]);

  // Calculate projection
  const projection: ProjectionResult | null = useMemo(() => {
    const p = parseFloat(principal) || 0;
    const m = parseFloat(monthlyContribution) || 0;
    const y = parseInt(years) || 0;

    if (y <= 0 || y > 50) return null;

    return calculateCompoundInterest(p, m, blendedReturn, y);
  }, [principal, monthlyContribution, years, blendedReturn]);

  // Calculate years to target
  const yearsToTarget = useMemo(() => {
    const p = parseFloat(principal) || 0;
    const m = parseFloat(monthlyContribution) || 0;
    const target = parseFloat(targetAmount) || 0;

    if (target <= p || blendedReturn <= 0) return null;

    return yearsToReachTarget(p, m, blendedReturn, target);
  }, [principal, monthlyContribution, targetAmount, blendedReturn]);

  const handleUseCurrentNetWorth = () => {
    if (stats.totalNetWorth > 0) {
      setPrincipal(Math.round(stats.totalNetWorth).toString());
    }
  };

  const handleResetReturns = () => {
    setCustomReturns({
      stocks: (DEFAULT_RETURNS.stocks * 100).toString(),
      crypto: (DEFAULT_RETURNS.crypto * 100).toString(),
      cash: (DEFAULT_RETURNS.cash * 100).toString(),
      stablecoins: (DEFAULT_RETURNS.stablecoins * 100).toString(),
    });
  };

  const handleReturnChange = (asset: AssetClass, value: string) => {
    setCustomReturns((prev) => ({ ...prev, [asset]: value }));
  };

  const hasPortfolio = stats.totalNetWorth > 0;

  return {
    // Settings
    currency,
    // Portfolio data
    stats,
    hasPortfolio,
    portfolioAllocation,
    portfolioReturn,
    contributionAllocationNumbers,
    contributionReturn,
    blendedReturn,
    // Form state
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
    // Computed
    projection,
    yearsToTarget,
    // Handlers
    handleUseCurrentNetWorth,
    handleResetReturns,
    handleReturnChange,
  };
};
