import type { StateCreator } from 'zustand';
import type { Expense } from '../../types';
import type { StoreState, ExpensesSlice } from '../types';

/**
 * Normalize description for duplicate detection and merchant matching
 */
const normalizeDescription = (desc: string): string => {
  return desc
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/['"]/g, '')
    .trim();
};

export const createExpensesSlice: StateCreator<
  StoreState,
  [],
  [],
  ExpensesSlice
> = (set) => ({
  expenses: [],

  addExpense: (expense) => {
    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ expenses: [...state.expenses, newExpense] }));
    return newExpense;
  },

  addExpenses: (transactions, source, provider, categoryMapping) => {
    const newExpenses: Expense[] = transactions.map((t) => ({
      id: crypto.randomUUID(),
      date: t.date,
      description: t.description,
      amount: t.amount,
      currency: t.currency,
      category: categoryMapping?.(t.merchantName || t.description),
      source,
      sourceProvider: provider,
      merchantName: t.merchantName,
      cardLastFour: t.cardLastFour,
      originalLine: t.originalLine,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    set((state) => ({ expenses: [...state.expenses, ...newExpenses] }));
    return newExpenses;
  },

  updateExpense: (id, data) => {
    set((state) => ({
      expenses: state.expenses.map((expense) =>
        expense.id === id
          ? { ...expense, ...data, updatedAt: new Date().toISOString() }
          : expense
      ),
    }));
  },

  deleteExpense: (id) => {
    set((state) => ({
      expenses: state.expenses.filter((expense) => expense.id !== id),
    }));
  },

  deleteExpenses: (ids) => {
    set((state) => ({
      expenses: state.expenses.filter((expense) => !ids.includes(expense.id)),
    }));
  },

  updateCategoryForMerchant: (merchantName, category) => {
    const normalized = normalizeDescription(merchantName);
    set((state) => ({
      expenses: state.expenses.map((expense) => {
        const expenseMerchant = normalizeDescription(
          expense.merchantName || expense.description
        );
        if (expenseMerchant === normalized) {
          return { ...expense, category, updatedAt: new Date().toISOString() };
        }
        return expense;
      }),
    }));
  },
});
