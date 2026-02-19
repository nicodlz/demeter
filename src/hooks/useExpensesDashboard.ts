import { useMemo } from 'react';
import { useExpenses } from './useExpenses';
import type { Currency } from '../schemas';

export interface ExpenseMonthlyData {
  month: string;
  monthLabel: string;
  total: number;
  count: number;
}

export interface ExpenseCategoryData {
  category: string;
  total: number;
  count: number;
  percentage: number;
  color: string;
}

export interface ExpenseSourceData {
  source: string;
  total: number;
  count: number;
  percentage: number;
}

// Previously lived in useCashFlowDashboard — exported here so consumers stay compatible
export interface CashFlowMonthlyData {
  month: string;
  monthLabel: string;
  income: number;
  expenses: number;
  balance: number;
}

const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#78716c',
];

type ConvertFn = (amount: number, from: Currency, to: Currency) => number;

export const useExpensesDashboard = (
  startDate?: string,
  endDate?: string,
  targetCurrency: Currency = 'USD',
  convert?: ConvertFn
) => {
  const { expenses } = useExpenses();

  // Helper to convert amount to target currency
  const toTarget = (amount: number, fromCurrency: Currency): number => {
    if (!convert || fromCurrency === targetCurrency) return amount;
    return convert(amount, fromCurrency, targetCurrency);
  };

  return useMemo(() => {
    // ─── Expenses-only stats (filtered by date range) ───────────────────────

    // Filter to only expense-type entries (retrocompatible: missing type = expense)
    let filteredExpenses = expenses.filter((e) => !e.type || e.type === 'expense');
    if (startDate) {
      filteredExpenses = filteredExpenses.filter((e) => e.date >= startDate);
    }
    if (endDate) {
      filteredExpenses = filteredExpenses.filter((e) => e.date <= endDate);
    }

    // Total stats (converted to target currency)
    const totalAmount = filteredExpenses.reduce((sum, e) => sum + toTarget(e.amount, e.currency), 0);
    const totalCount = filteredExpenses.length;

    // Average per transaction
    const avgPerTransaction = totalCount > 0 ? totalAmount / totalCount : 0;

    // Monthly breakdown (last 12 months)
    const monthlyMap = new Map<string, { total: number; count: number }>();

    filteredExpenses.forEach((expense) => {
      const month = expense.date.substring(0, 7); // YYYY-MM
      const existing = monthlyMap.get(month) || { total: 0, count: 0 };
      monthlyMap.set(month, {
        total: existing.total + toTarget(expense.amount, expense.currency),
        count: existing.count + 1,
      });
    });

    const monthlyData: ExpenseMonthlyData[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => {
        const [year, m] = month.split('-');
        const date = new Date(parseInt(year), parseInt(m) - 1);
        return {
          month,
          monthLabel: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          total: data.total,
          count: data.count,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    // Category breakdown
    const categoryMap = new Map<string, { total: number; count: number }>();

    filteredExpenses.forEach((expense) => {
      const category = expense.category || 'Uncategorized';
      const existing = categoryMap.get(category) || { total: 0, count: 0 };
      categoryMap.set(category, {
        total: existing.total + toTarget(expense.amount, expense.currency),
        count: existing.count + 1,
      });
    });

    const categoryData: ExpenseCategoryData[] = Array.from(categoryMap.entries())
      .map(([category, data], index) => ({
        category,
        total: data.total,
        count: data.count,
        percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.total - a.total);

    // Source breakdown
    const sourceMap = new Map<string, { total: number; count: number }>();

    filteredExpenses.forEach((expense) => {
      const existing = sourceMap.get(expense.source) || { total: 0, count: 0 };
      sourceMap.set(expense.source, {
        total: existing.total + toTarget(expense.amount, expense.currency),
        count: existing.count + 1,
      });
    });

    const sourceData: ExpenseSourceData[] = Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source,
        total: data.total,
        count: data.count,
        percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Top merchants
    const merchantMap = new Map<string, { total: number; count: number }>();

    filteredExpenses.forEach((expense) => {
      const merchant = expense.merchantName || expense.description;
      const existing = merchantMap.get(merchant) || { total: 0, count: 0 };
      merchantMap.set(merchant, {
        total: existing.total + toTarget(expense.amount, expense.currency),
        count: existing.count + 1,
      });
    });

    const topMerchants = Array.from(merchantMap.entries())
      .map(([merchant, data]) => ({
        merchant,
        total: data.total,
        count: data.count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Daily average (based on date range)
    let dailyAverage = 0;
    if (filteredExpenses.length > 0) {
      const dates = filteredExpenses.map((e) => new Date(e.date).getTime());
      const minDate = Math.min(...dates);
      const maxDate = Math.max(...dates);
      const daysDiff = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1);
      dailyAverage = totalAmount / daysDiff;
    }

    // Month over month comparison (using completed months only - excluding current month)
    const now = new Date();

    // Last completed month (previous month)
    const lastCompletedDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastCompletedMonth = `${lastCompletedDate.getFullYear()}-${String(lastCompletedDate.getMonth() + 1).padStart(2, '0')}`;

    // Month before that
    const previousDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;

    const lastCompletedMonthData = monthlyMap.get(lastCompletedMonth) || { total: 0, count: 0 };
    const previousMonthData = monthlyMap.get(previousMonth) || { total: 0, count: 0 };

    const monthOverMonthChange = lastCompletedMonthData.total - previousMonthData.total;
    const monthOverMonthPercentage = previousMonthData.total > 0
      ? ((lastCompletedMonthData.total - previousMonthData.total) / previousMonthData.total) * 100
      : 0;

    // Get month labels for display
    const lastCompletedMonthLabel = lastCompletedDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const previousMonthLabel = previousDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    // ─── Cash flow stats (all expenses, last 12 months, income + expense) ────
    // Computed independently of the date filter so the Cash Flow section always
    // shows a full rolling 12-month picture regardless of the Expenses filter.

    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let currentMonthIncome = 0;
    let currentMonthExpenses = 0;

    expenses.forEach((e) => {
      if (!e.date.startsWith(currentMonth)) return;
      const converted = toTarget(e.amount, e.currency);
      if (e.type === 'income') {
        currentMonthIncome += converted;
      } else {
        currentMonthExpenses += converted;
      }
    });

    const balance = currentMonthIncome - currentMonthExpenses;
    const savingsRate = currentMonthIncome > 0
      ? ((currentMonthIncome - currentMonthExpenses) / currentMonthIncome) * 100
      : 0;

    // Monthly breakdown for last 12 months (income + expenses)
    const cashFlowMonthlyMap = new Map<string, { income: number; expenses: number }>();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      cashFlowMonthlyMap.set(key, { income: 0, expenses: 0 });
    }

    expenses.forEach((expense) => {
      const month = expense.date.substring(0, 7);
      const entry = cashFlowMonthlyMap.get(month);
      if (!entry) return;

      const converted = toTarget(expense.amount, expense.currency);
      if (expense.type === 'income') {
        entry.income += converted;
      } else {
        entry.expenses += converted;
      }
    });

    const cashFlowMonthlyData: CashFlowMonthlyData[] = Array.from(cashFlowMonthlyMap.entries())
      .map(([month, data]) => {
        const [year, m] = month.split('-');
        const date = new Date(parseInt(year), parseInt(m) - 1);
        return {
          month,
          monthLabel: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          income: data.income,
          expenses: data.expenses,
          balance: data.income - data.expenses,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      // Expenses section
      totalAmount,
      totalCount,
      avgPerTransaction,
      dailyAverage,
      lastCompletedMonth: { ...lastCompletedMonthData, label: lastCompletedMonthLabel },
      previousMonth: { ...previousMonthData, label: previousMonthLabel },
      monthOverMonthChange,
      monthOverMonthPercentage,
      monthlyData,
      categoryData,
      sourceData,
      topMerchants,
      // Cash flow section (previously useCashFlowDashboard)
      currentMonthIncome,
      currentMonthExpenses,
      balance,
      savingsRate,
      cashFlowMonthlyData,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, startDate, endDate, targetCurrency, convert]);
};
