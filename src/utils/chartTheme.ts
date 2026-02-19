/**
 * Centralized chart color palette for all chart components.
 * Import from this file instead of hardcoding hex values.
 */

/**
 * Ordered color array for expense/income categories (pie charts, sankey, etc.).
 * Used by: useExpensesDashboard, useCashFlowPage, CashFlowSankey.
 */
export const CATEGORY_COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#14b8a6', // teal-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#6b7280', // gray-500
  '#78716c', // stone-500
] as const;

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

type ChartColorKey = keyof typeof CHART_COLORS;
