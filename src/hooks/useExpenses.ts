import { useState, useEffect, useCallback } from 'react';
import type { Expense, ParsedTransaction, Currency, BankProvider } from '../types';
import { expenseSchema } from '../schemas';
import { storage, STORAGE_KEYS } from '../utils/storage';

/**
 * Normalize description for duplicate detection
 */
const normalizeDescription = (desc: string): string => {
  return desc
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/['"]/g, '')
    .trim();
};

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    storage.get<Expense[]>(STORAGE_KEYS.EXPENSES, [])
  );

  // Sync to localStorage
  useEffect(() => {
    storage.set(STORAGE_KEYS.EXPENSES, expenses);
  }, [expenses]);

  // Add single expense
  const addExpense = (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Expense => {
    const newExpense = {
      ...expense,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = expenseSchema.safeParse(newExpense);
    if (!result.success) {
      console.error('[Demeter] Invalid expense data:', result.error.issues);
      // Return unvalidated to avoid breaking the UI, but don't persist
      return newExpense as Expense;
    }
    setExpenses((prev) => [...prev, result.data]);
    return result.data;
  };

  // Add multiple expenses (batch import)
  const addExpenses = (
    transactions: ParsedTransaction[],
    source: string,
    provider: BankProvider,
    categoryMapping?: (merchantName: string) => string | undefined
  ): Expense[] => {
    const validExpenses: Expense[] = [];
    for (const t of transactions) {
      const raw = {
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
      };
      const result = expenseSchema.safeParse(raw);
      if (result.success) {
        validExpenses.push(result.data);
      } else {
        console.warn('[Demeter] Skipping invalid expense during import:', result.error.issues);
      }
    }
    setExpenses((prev) => [...prev, ...validExpenses]);
    return validExpenses;
  };

  // Update expense
  const updateExpense = (id: string, data: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((expense) => {
        if (expense.id !== id) return expense;
        const updated = { ...expense, ...data, updatedAt: new Date().toISOString() };
        const result = expenseSchema.safeParse(updated);
        if (!result.success) {
          console.error('[Demeter] Invalid expense update:', result.error.issues);
          return expense;
        }
        return result.data;
      })
    );
  };

  // Delete single expense
  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));
  };

  // Delete multiple expenses
  const deleteExpenses = (ids: string[]) => {
    setExpenses((prev) => prev.filter((expense) => !ids.includes(expense.id)));
  };

  // Find duplicates among parsed transactions
  const findDuplicates = useCallback(
    (transactions: ParsedTransaction[]): {
      unique: ParsedTransaction[];
      duplicates: ParsedTransaction[];
    } => {
      const unique: ParsedTransaction[] = [];
      const duplicates: ParsedTransaction[] = [];

      for (const transaction of transactions) {
        const isDuplicate = expenses.some(
          (e) =>
            e.date === transaction.date &&
            Math.abs(e.amount - transaction.amount) < 0.01 &&
            normalizeDescription(e.description) === normalizeDescription(transaction.description)
        );

        if (isDuplicate) {
          duplicates.push(transaction);
        } else {
          unique.push(transaction);
        }
      }

      return { unique, duplicates };
    },
    [expenses]
  );

  // Query helpers
  const getExpenseById = (id: string) => expenses.find((e) => e.id === id);

  const getExpensesByDateRange = useCallback(
    (start: string, end: string) => {
      return expenses.filter((e) => e.date >= start && e.date <= end);
    },
    [expenses]
  );

  const getExpensesByCategory = useCallback(
    (category: string) => {
      return expenses.filter((e) => e.category === category);
    },
    [expenses]
  );

  const getExpensesBySource = useCallback(
    (source: string) => {
      return expenses.filter((e) => e.source === source);
    },
    [expenses]
  );

  const getSortedExpenses = useCallback(() => {
    return [...expenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [expenses]);

  // Aggregations
  const getTotalByDateRange = useCallback(
    (start: string, end: string, currency?: Currency) => {
      return expenses
        .filter(
          (e) =>
            e.date >= start &&
            e.date <= end &&
            (!currency || e.currency === currency)
        )
        .reduce((sum, e) => sum + e.amount, 0);
    },
    [expenses]
  );

  const getUniqueSources = useCallback(() => {
    return [...new Set(expenses.map((e) => e.source))];
  }, [expenses]);

  const getUniqueCategories = useCallback(() => {
    return [...new Set(expenses.filter((e) => e.category).map((e) => e.category!))];
  }, [expenses]);

  // Update category for all expenses with same merchant
  const updateCategoryForMerchant = (merchantName: string, category: string) => {
    const normalized = normalizeDescription(merchantName);
    setExpenses((prev) =>
      prev.map((expense) => {
        const expenseMerchant = normalizeDescription(expense.merchantName || expense.description);
        if (expenseMerchant === normalized) {
          return { ...expense, category, updatedAt: new Date().toISOString() };
        }
        return expense;
      })
    );
  };

  // Export
  const exportAsJSON = () => {
    const dataStr = JSON.stringify(expenses, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const headers = ['Date', 'Description', 'Amount', 'Currency', 'Category', 'Source', 'Merchant'];
    const rows = expenses.map((e) => [
      e.date,
      `"${e.description.replace(/"/g, '""')}"`,
      e.amount.toFixed(2),
      e.currency,
      e.category || '',
      e.source,
      e.merchantName || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
    expenses,
    addExpense,
    addExpenses,
    updateExpense,
    deleteExpense,
    deleteExpenses,
    findDuplicates,
    getExpenseById,
    getExpensesByDateRange,
    getExpensesByCategory,
    getExpensesBySource,
    getSortedExpenses,
    getTotalByDateRange,
    getUniqueSources,
    getUniqueCategories,
    updateCategoryForMerchant,
    exportAsJSON,
    exportAsCSV,
  };
};
