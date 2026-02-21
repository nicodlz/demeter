import { useCallback } from 'react';
import { useStore } from '../store';
import type { ParsedTransaction, Currency } from '@/schemas';

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
  const expenses = useStore((state) => state.expenses);
  const addExpense = useStore((state) => state.addExpense);
  const addExpenses = useStore((state) => state.addExpenses);
  const addRecurringIncome = useStore((state) => state.addRecurringIncome);
  const updateExpense = useStore((state) => state.updateExpense);
  const deleteExpense = useStore((state) => state.deleteExpense);
  const deleteExpenses = useStore((state) => state.deleteExpenses);
  const updateCategoryForMerchant = useStore(
    (state) => state.updateCategoryForMerchant
  );

  // Find duplicates among parsed transactions
  const findDuplicates = useCallback(
    (
      transactions: ParsedTransaction[]
    ): {
      unique: ParsedTransaction[];
      duplicates: ParsedTransaction[];
    } => {
      // Build a Set of existing expense keys for O(1) lookup
      const existingKeys = new Set(
        expenses.map((e) =>
          `${e.date}|${normalizeDescription(e.merchantName || e.description)}|${e.amount}`
        )
      );

      const unique: ParsedTransaction[] = [];
      const duplicates: ParsedTransaction[] = [];

      for (const transaction of transactions) {
        const key = `${transaction.date}|${normalizeDescription(transaction.merchantName || transaction.description)}|${Math.abs(transaction.amount)}`;

        if (existingKeys.has(key)) {
          duplicates.push(transaction);
        } else {
          existingKeys.add(key); // also dedup within the batch
          unique.push(transaction);
        }
      }

      return { unique, duplicates };
    },
    [expenses]
  );

  // Query helpers
  const getExpenseById = useCallback(
    (id: string) => expenses.find((e) => e.id === id),
    [expenses]
  );

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

  // Type-based filters (retrocompatible: missing type treated as 'expense')
  const getIncomes = useCallback(() => {
    return expenses.filter((e) => e.type === 'income');
  }, [expenses]);

  const getExpensesOnly = useCallback(() => {
    return expenses.filter((e) => !e.type || e.type === 'expense');
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

  const getTotalIncomeByDateRange = useCallback(
    (start: string, end: string, currency?: Currency) => {
      return expenses
        .filter(
          (e) =>
            e.type === 'income' &&
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
    return [
      ...new Set(expenses.filter((e) => e.category).map((e) => e.category!)),
    ];
  }, [expenses]);

  // Export
  const exportAsJSON = useCallback(() => {
    const dataStr = JSON.stringify(expenses, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [expenses]);

  const exportAsCSV = useCallback(() => {
    const headers = [
      'Date',
      'Description',
      'Amount',
      'Currency',
      'Category',
      'Source',
      'Merchant',
    ];
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
  }, [expenses]);

  return {
    expenses,
    addExpense,
    addExpenses,
    addRecurringIncome,
    updateExpense,
    deleteExpense,
    deleteExpenses,
    findDuplicates,
    getExpenseById,
    getExpensesByDateRange,
    getExpensesByCategory,
    getExpensesBySource,
    getSortedExpenses,
    getIncomes,
    getExpensesOnly,
    getTotalByDateRange,
    getTotalIncomeByDateRange,
    getUniqueSources,
    getUniqueCategories,
    updateCategoryForMerchant,
    exportAsJSON,
    exportAsCSV,
  };
};
