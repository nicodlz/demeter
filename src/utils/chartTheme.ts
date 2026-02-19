/**
 * Centralized chart color palette for all chart components.
 * Import from this file instead of hardcoding hex values.
 */
export const CHART_COLORS = {
  /** Blue – primary series, stocks */
  blue: '#3b82f6',
  /** Green – gains, income, VAT, cash */
  green: '#10b981',
  /** Amber – secondary trend line, crypto */
  amber: '#f59e0b',
  /** Purple – stablecoins */
  purple: '#8b5cf6',
  /** Lime-green – income bars (cash-flow) */
  lime: '#22c55e',
} as const;

export type ChartColorKey = keyof typeof CHART_COLORS;
