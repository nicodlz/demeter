import { useState, useMemo } from 'react';
import type { Expense, ParsedTransaction, BankProvider } from '@/types';
import { useExpenses } from '@/hooks/useExpenses';
import { useCategoryMappings } from '@/hooks/useCategoryMappings';
import { formatCurrency } from '@/utils/formatters';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExpenseTable } from '@/components/expenses/ExpenseTable';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseImportModal } from '@/components/expenses/ExpenseImportModal';
import { ExpenseByCategoryChart } from '@/components/expenses/ExpenseByCategoryChart';
import { Upload, Plus, Download, X } from 'lucide-react';

const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#78716c',
];

export const ExpensesPage = () => {
  const {
    expenses,
    addExpense,
    addExpenses,
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
      const month = e.date.substring(0, 7); // YYYY-MM
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

  // Apply filters
  const filteredExpenses = useMemo(() => {
    return sortedExpenses.filter((e) => {
      if (filterMonth !== 'all' && !e.date.startsWith(filterMonth)) return false;
      if (filterSource !== 'all' && e.source !== filterSource) return false;
      if (filterCategory !== 'all') {
        if (filterCategory === 'uncategorized' && e.category) return false;
        if (filterCategory !== 'uncategorized' && e.category !== filterCategory) return false;
      }
      return true;
    });
  }, [sortedExpenses, filterMonth, filterSource, filterCategory]);

  // Check if any filter is active
  const hasActiveFilters = filterMonth !== 'all' || filterSource !== 'all' || filterCategory !== 'all';

  const clearFilters = () => {
    setFilterMonth('all');
    setFilterSource('all');
    setFilterCategory('all');
  };

  // Format month for display
  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Calculate stats (adapts to filtered month)
  const stats = useMemo(() => {
    // Helper to get previous month string
    const getPreviousMonth = (monthStr: string) => {
      const [year, month] = monthStr.split('-').map(Number);
      const prevDate = new Date(year, month - 2, 1); // month is 1-based, Date uses 0-based
      return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    };

    // Helper to format month label
    const getMonthLabel = (monthStr: string) => {
      const [year, month] = monthStr.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    };

    if (filterMonth !== 'all') {
      // When a month is filtered, show stats for that month vs previous
      const selectedMonthExpenses = expenses.filter((e) => e.date.startsWith(filterMonth));
      const selectedTotal = selectedMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

      const prevMonth = getPreviousMonth(filterMonth);
      const prevMonthExpenses = expenses.filter((e) => e.date.startsWith(prevMonth));
      const prevTotal = prevMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

      // Also apply source/category filters for the "filtered total"
      const filteredTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

      return {
        totalAll: filteredTotal,
        totalCount: filteredExpenses.length,
        lastCompleted: selectedTotal,
        lastCompletedCount: selectedMonthExpenses.length,
        lastCompletedLabel: getMonthLabel(filterMonth),
        previous: prevTotal,
        previousCount: prevMonthExpenses.length,
        previousLabel: getMonthLabel(prevMonth),
      };
    }

    // Default: show last completed month stats
    const now = new Date();
    const lastCompletedDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastCompletedMonth = `${lastCompletedDate.getFullYear()}-${String(lastCompletedDate.getMonth() + 1).padStart(2, '0')}`;
    const lastCompletedLabel = lastCompletedDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    const previousDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
    const previousLabel = previousDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    const lastCompletedExpenses = expenses.filter((e) => e.date.startsWith(lastCompletedMonth));
    const previousExpenses = expenses.filter((e) => e.date.startsWith(previousMonth));

    const lastCompletedTotal = lastCompletedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const previousTotal = previousExpenses.reduce((sum, e) => sum + e.amount, 0);

    const totalAll = expenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      totalAll,
      totalCount: expenses.length,
      lastCompleted: lastCompletedTotal,
      lastCompletedCount: lastCompletedExpenses.length,
      lastCompletedLabel,
      previous: previousTotal,
      previousCount: previousExpenses.length,
      previousLabel,
    };
  }, [expenses, filterMonth, filteredExpenses]);

  // Calculate category breakdown from filtered expenses
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, { total: number; count: number }>();
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    filteredExpenses.forEach((expense) => {
      const category = expense.category || 'Uncategorized';
      const existing = categoryMap.get(category) || { total: 0, count: 0 };
      categoryMap.set(category, {
        total: existing.total + expense.amount,
        count: existing.count + 1,
      });
    });

    return Array.from(categoryMap.entries())
      .map(([category, data], index) => ({
        category,
        total: data.total,
        count: data.count,
        percentage: total > 0 ? (data.total / total) * 100 : 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  const handleAddExpense = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    addExpense(data);
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

    // Save the mapping for future auto-categorization
    setMerchantCategory(merchant, category);

    // Update all expenses with the same merchant
    updateCategoryForMerchant(merchant, category);
  };

  // Show form if adding or editing
  if (showForm || editingExpense) {
    return (
      <div className="space-y-6">
        <ExpenseForm
          expense={editingExpense || undefined}
          categories={allCategories}
          onSubmit={editingExpense ? handleEditExpense : handleAddExpense}
          onCancel={() => {
            setShowForm(false);
            setEditingExpense(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
          <p className="text-muted-foreground">
            Track and manage your personal expenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportAsCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Expense
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {filterMonth !== 'all' ? 'Filtered Total' : 'Total'} ({stats.totalCount} transactions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(stats.totalAll, 'EUR')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stats.lastCompletedLabel} ({stats.lastCompletedCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(stats.lastCompleted, 'EUR')}
            </div>
            {stats.previous > 0 && (
              <p className={`text-xs ${stats.lastCompleted > stats.previous ? 'text-destructive' : 'text-green-500'}`}>
                {stats.lastCompleted > stats.previous ? '+' : ''}
                {((stats.lastCompleted - stats.previous) / stats.previous * 100).toFixed(0)}% vs {stats.previousLabel}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stats.previousLabel} ({stats.previousCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {formatCurrency(stats.previous, 'EUR')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Chart */}
      {filteredExpenses.length > 0 && (
        <ExpenseByCategoryChart
          data={categoryData}
          totalAmount={stats.totalAll}
          currency="EUR"
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {availableMonths.map((month) => (
              <SelectItem key={month} value={month}>
                {formatMonth(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {availableSources.map((source) => (
              <SelectItem key={source} value={source}>
                {source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="uncategorized">Uncategorized</SelectItem>
            {allCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
            <X className="mr-1 h-4 w-4" />
            Clear filters
          </Button>
        )}

        {hasActiveFilters && (
          <span className="text-sm text-muted-foreground">
            {filteredExpenses.length} of {sortedExpenses.length} expenses
          </span>
        )}
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {hasActiveFilters ? 'Filtered Expenses' : 'All Expenses'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ExpenseTable
            expenses={filteredExpenses}
            categories={allCategories}
            onEdit={(expense) => setEditingExpense(expense)}
            onDelete={deleteExpense}
            onCategorySelect={handleCategorySelect}
          />
        </CardContent>
      </Card>

      {/* Import Modal */}
      <ExpenseImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        findDuplicates={findDuplicates}
      />

    </div>
  );
};
