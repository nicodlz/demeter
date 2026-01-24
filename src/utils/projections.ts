import type { AssetClass } from '@/types';

// Default expected annual returns by asset class
export const DEFAULT_RETURNS: Record<AssetClass, number> = {
  stocks: 0.07,      // 7%
  crypto: 0.15,      // 15% (volatile, user should adjust)
  cash: 0.02,        // 2% (savings accounts)
  stablecoins: 0.05, // 5% (DeFi yields)
};

export interface ProjectionYear {
  year: number;
  totalValue: number;
  totalContributed: number;
  totalGains: number;
  yearlyContribution: number;
  yearlyGains: number;
}

export interface ProjectionResult {
  finalValue: number;
  totalContributed: number;
  totalGains: number;
  projectionByYear: ProjectionYear[];
  yearsToTarget?: number;
}

/**
 * Calculate compound interest with monthly contributions
 * Formula: FV = P(1+r)^n + PMT × ((1+r)^n - 1) / r
 * Where:
 * - P = Principal (initial investment)
 * - r = Monthly interest rate
 * - n = Number of months
 * - PMT = Monthly contribution
 */
export function calculateCompoundInterest(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  years: number
): ProjectionResult {
  const monthlyRate = annualRate / 12;
  const projectionByYear: ProjectionYear[] = [];

  let currentValue = principal;
  let totalContributed = principal;

  for (let year = 1; year <= years; year++) {
    const startOfYearValue = currentValue;
    let yearlyContribution = 0;

    // Calculate month by month for this year
    for (let month = 1; month <= 12; month++) {
      // Add monthly contribution at start of month
      currentValue += monthlyContribution;
      yearlyContribution += monthlyContribution;
      totalContributed += monthlyContribution;

      // Apply monthly interest
      currentValue *= (1 + monthlyRate);
    }

    const yearlyGains = currentValue - startOfYearValue - yearlyContribution;
    const totalGains = currentValue - totalContributed;

    projectionByYear.push({
      year,
      totalValue: Math.round(currentValue * 100) / 100,
      totalContributed: Math.round(totalContributed * 100) / 100,
      totalGains: Math.round(totalGains * 100) / 100,
      yearlyContribution: Math.round(yearlyContribution * 100) / 100,
      yearlyGains: Math.round(yearlyGains * 100) / 100,
    });
  }

  return {
    finalValue: Math.round(currentValue * 100) / 100,
    totalContributed: Math.round(totalContributed * 100) / 100,
    totalGains: Math.round((currentValue - totalContributed) * 100) / 100,
    projectionByYear,
  };
}

/**
 * Calculate years needed to reach a target amount
 */
export function yearsToReachTarget(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  target: number,
  maxYears: number = 100
): number | null {
  const monthlyRate = annualRate / 12;
  let currentValue = principal;
  let months = 0;

  while (currentValue < target && months < maxYears * 12) {
    currentValue += monthlyContribution;
    currentValue *= (1 + monthlyRate);
    months++;
  }

  if (currentValue >= target) {
    return Math.ceil(months / 12);
  }

  return null;
}

/**
 * Calculate weighted average return based on allocation
 */
export function calculateWeightedReturn(
  allocation: Record<AssetClass, number>,
  customReturns?: Partial<Record<AssetClass, number>>
): number {
  const returns = { ...DEFAULT_RETURNS, ...customReturns };
  const total = Object.values(allocation).reduce((sum, val) => sum + val, 0);

  if (total === 0) return 0;

  let weightedReturn = 0;
  for (const [asset, amount] of Object.entries(allocation)) {
    const weight = amount / total;
    const assetReturn = returns[asset as AssetClass] || 0;
    weightedReturn += weight * assetReturn;
  }

  return weightedReturn;
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
