import { useMemo } from 'react';
import { useExpenses } from './useExpenses';
import type { Currency } from '../schemas';

export interface CashFlowMonthlyData {
  month: string;
  monthLabel: string;
  income: number;
  expenses: number;
  balance: number;
}

type ConvertFn = (amount: number, from: Currency, to: Currency) => number;

export const useCashFlowDashboard = (
  targetCurrency: Currency = 'USD',
  convert?: ConvertFn
) => {
  const { expenses } = useExpenses();

  const toTarget = (amount: number, fromCurrency: Currency): number => {
    if (!convert || fromCurrency === targetCurrency) return amount;
    return convert(amount, fromCurrency, targetCurrency);
  };

  return useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Current month totals
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

    // Monthly breakdown for last 12 months
    const monthlyMap = new Map<string, { income: number; expenses: number }>();

    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, { income: 0, expenses: 0 });
    }

    expenses.forEach((expense) => {
      const month = expense.date.substring(0, 7);
      const entry = monthlyMap.get(month);
      if (!entry) return;

      const converted = toTarget(expense.amount, expense.currency);
      if (expense.type === 'income') {
        entry.income += converted;
      } else {
        entry.expenses += converted;
      }
    });

    const monthlyData: CashFlowMonthlyData[] = Array.from(monthlyMap.entries())
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
      currentMonthIncome,
      currentMonthExpenses,
      balance,
      savingsRate,
      monthlyData,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, targetCurrency, convert]);
};
