import { useState, useMemo } from 'react';
import type { Expense, ExpenseType, ParsedTransaction, BankProvider, Currency } from '@/schemas';
import { useExpenses } from '@/hooks/useExpenses';
import { useCategoryMappings } from '@/hooks/useCategoryMappings';
import { useSettings } from '@/hooks/useSettings';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { getMonthKey, getMonthLabel, formatMonthFull } from '@/utils/formatters';

export type TabValue = 'all' | 'expenses' | 'income';

const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#78716c',
];

export const useCashFlowPage = () => {
  const { settings, updateSettings } = useSettings();
  const { convert } = useExchangeRate();
  const displayCurrency: Currency = settings.dashboardCurrency || 'USD';

  const toggleCurrency = () => {
    const newCurrency: Currency = displayCurrency === 'USD' ? 'EUR' : 'USD';
    updateSettings({ dashboardCurrency: newCurrency });
  };

  const {
    expenses,
    addExpense,
    addExpenses,
    addRecurringIncome,
    updateExpense,
    deleteExpense,
    findDuplicates,
    getSortedExpenses,
    getUniqueCategories,
    updateCategoryForMerchant,
    exportAsCSV,
  } = useExpenses();

  const {
    setMerchantCategory,
    getUniqueCategories: getMappingCategories,
    createCategoryMapper,
  } = useCategoryMappings();

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [defaultFormType, setDefaultFormType] = useState<ExpenseType>('expense');

  // Filters
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Combine categories from expenses and mappings
  const allCategories = useMemo(() => {
    const fromExpenses = getUniqueCategories();
    const fromMappings = getMappingCategories();
    return [...new Set([...fromExpenses, ...fromMappings])].sort();
  }, [getUniqueCategories, getMappingCategories]);

  // Get unique months from expenses (sorted desc)
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    expenses.forEach((e) => {
      const month = e.date.substring(0, 7);
      months.add(month);
    });
    return Array.from(months).sort().reverse();
  }, [expenses]);

  // Get unique sources from expenses
  const availableSources = useMemo(() => {
    const sources = new Set<string>();
    expenses.forEach((e) => sources.add(e.source));
    return Array.from(sources).sort();
  }, [expenses]);

  const sortedExpenses = getSortedExpenses();

  // Apply filters including tab
  const filteredExpenses = useMemo(() => {
    return sortedExpenses.filter((e) => {
      if (activeTab === 'expenses' && e.type === 'income') return false;
      if (activeTab === 'income' && (!e.type || e.type === 'expense')) return false;

      if (filterMonth !== 'all' && !e.date.startsWith(filterMonth)) return false;
      if (filterSource !== 'all' && e.source !== filterSource) return false;
      if (filterCategory !== 'all') {
        if (filterCategory === 'uncategorized' && e.category) return false;
        if (filterCategory !== 'uncategorized' && e.category !== filterCategory) return false;
      }
      return true;
    });
  }, [sortedExpenses, activeTab, filterMonth, filterSource, filterCategory]);

  const hasActiveFilters = filterMonth !== 'all' || filterSource !== 'all' || filterCategory !== 'all';

  const clearFilters = () => {
    setFilterMonth('all');
    setFilterSource('all');
    setFilterCategory('all');
  };

  const formatMonth = (month: string) => formatMonthFull(month);

  // Calculate stats adapted to the active tab
  const stats = useMemo(() => {
    const getPreviousMonth = (monthStr: string) => {
      const [year, month] = monthStr.split('-').map(Number);
      const prevDate = new Date(year, month - 2, 1);
      return getMonthKey(prevDate);
    };

    const tabExpenses = expenses.filter((e) => {
      if (activeTab === 'expenses') return !e.type || e.type === 'expense';
      if (activeTab === 'income') return e.type === 'income';
      return true;
    });

    const allExpensesOnly = expenses.filter((e) => !e.type || e.type === 'expense');
    const allIncomesOnly = expenses.filter((e) => e.type === 'income');
    const totalIncome = allIncomesOnly.reduce((sum, e) => sum + convert(e.amount, e.currency, displayCurrency), 0);
    const totalExpensesAmount = allExpensesOnly.reduce((sum, e) => sum + convert(e.amount, e.currency, displayCurrency), 0);

    if (filterMonth !== 'all') {
      const selectedMonthExpenses = tabExpenses.filter((e) => e.date.startsWith(filterMonth));
      const selectedTotal = selectedMonthExpenses.reduce((sum, e) => sum + convert(e.amount, e.currency, displayCurrency), 0);

      const prevMonth = getPreviousMonth(filterMonth);
      const prevMonthExpenses = tabExpenses.filter((e) => e.date.startsWith(prevMonth));
      const prevTotal = prevMonthExpenses.reduce((sum, e) => sum + convert(e.amount, e.currency, displayCurrency), 0);

      const filteredTotal = filteredExpenses.reduce((sum, e) => sum + convert(e.amount, e.currency, displayCurrency), 0);

      return {
        totalAll: filteredTotal,
        totalCount: filteredExpenses.length,
        lastCompleted: selectedTotal,
        lastCompletedCount: selectedMonthExpenses.length,
        lastCompletedLabel: getMonthLabel(filterMonth),
        previous: prevTotal,
        previousCount: prevMonthExpenses.length,
        previousLabel: getMonthLabel(prevMonth),
        totalIncome,
        totalExpenses: totalExpensesAmount,
      };
    }

    const now = new Date();
    const lastCompletedDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastCompletedMonth = getMonthKey(lastCompletedDate);
    const lastCompletedLabel = getMonthLabel(lastCompletedMonth);

    const previousDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const previousMonth = getMonthKey(previousDate);
    const previousLabel = getMonthLabel(previousMonth);

    const lastCompletedExpenses = tabExpenses.filter((e) => e.date.startsWith(lastCompletedMonth));
    const previousExpenses = tabExpenses.filter((e) => e.date.startsWith(previousMonth));

    const lastCompletedTotal = lastCompletedExpenses.reduce((sum, e) => sum + convert(e.amount, e.currency, displayCurrency), 0);
    const previousTotal = previousExpenses.reduce((sum, e) => sum + convert(e.amount, e.currency, displayCurrency), 0);

    const totalAll = tabExpenses.reduce((sum, e) => sum + convert(e.amount, e.currency, displayCurrency), 0);

    return {
      totalAll,
      totalCount: tabExpenses.length,
      lastCompleted: lastCompletedTotal,
      lastCompletedCount: lastCompletedExpenses.length,
      lastCompletedLabel,
      previous: previousTotal,
      previousCount: previousExpenses.length,
      previousLabel,
      totalIncome,
      totalExpenses: totalExpensesAmount,
    };
  }, [expenses, activeTab, filterMonth, filteredExpenses, convert, displayCurrency]);

  // Calculate category breakdown from filtered expenses
  const categoryData = useMemo(() => {
    const expensesForChart = activeTab === 'income'
      ? filteredExpenses
      : filteredExpenses.filter((e) => !e.type || e.type === 'expense');
    const categoryMap = new Map<string, { total: number; count: number }>();
    const total = expensesForChart.reduce((sum, e) => sum + convert(e.amount, e.currency, displayCurrency), 0);

    expensesForChart.forEach((expense) => {
      const category = expense.category || 'Uncategorized';
      const existing = categoryMap.get(category) || { total: 0, count: 0 };
      categoryMap.set(category, {
        total: existing.total + convert(expense.amount, expense.currency, displayCurrency),
        count: existing.count + 1,
      });
    });

    return {
      data: Array.from(categoryMap.entries())
        .map(([category, data], index) => ({
          category,
          total: data.total,
          count: data.count,
          percentage: total > 0 ? (data.total / total) * 100 : 0,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }))
        .sort((a, b) => b.total - a.total),
      total,
    };
  }, [filteredExpenses, activeTab, convert, displayCurrency]);

  const handleAddExpense = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    addExpense(data);
    setShowForm(false);
  };

  const handleAddRecurring = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>, months: number) => {
    addRecurringIncome(data, months);
    setShowForm(false);
  };

  const handleEditExpense = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingExpense) {
      updateExpense(editingExpense.id, data);
      setEditingExpense(null);
    }
  };

  const handleImport = (
    transactions: ParsedTransaction[],
    source: string,
    provider: BankProvider
  ) => {
    const categoryMapper = createCategoryMapper();
    addExpenses(transactions, source, provider, categoryMapper);
  };

  const handleCategorySelect = (expenseId: string, category: string) => {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;

    const merchant = expense.merchantName || expense.description;
    setMerchantCategory(merchant, category);
    updateCategoryForMerchant(merchant, category);
  };

  const getStatColor = () => {
    if (activeTab === 'income') return 'text-green-600';
    if (activeTab === 'expenses') return 'text-destructive';
    return 'text-foreground';
  };

  return {
    // Settings
    settings,
    displayCurrency,
    toggleCurrency,
    convert,
    // Expense operations
    expenses,
    addExpense,
    deleteExpense,
    findDuplicates,
    exportAsCSV,
    // Form state
    showForm,
    setShowForm,
    editingExpense,
    setEditingExpense,
    showImportModal,
    setShowImportModal,
    activeTab,
    setActiveTab,
    defaultFormType,
    setDefaultFormType,
    // Filters
    filterMonth,
    setFilterMonth,
    filterSource,
    setFilterSource,
    filterCategory,
    setFilterCategory,
    hasActiveFilters,
    clearFilters,
    // Derived data
    allCategories,
    availableMonths,
    availableSources,
    sortedExpenses,
    filteredExpenses,
    stats,
    categoryData,
    // Formatters
    formatMonth,
    getStatColor,
    // Handlers
    handleAddExpense,
    handleAddRecurring,
    handleEditExpense,
    handleImport,
    handleCategorySelect,
  };
};
