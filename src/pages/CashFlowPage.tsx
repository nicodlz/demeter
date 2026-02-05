import { useState, useMemo } from 'react';
import type { Expense, ExpenseType, ParsedTransaction, BankProvider, Currency } from '@/types';
import { useExpenses } from '@/hooks/useExpenses';
import { useCategoryMappings } from '@/hooks/useCategoryMappings';
import { useSettings } from '@/hooks/useSettings';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { formatCurrency } from '@/utils/formatters';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExpenseTable } from '@/components/expenses/ExpenseTable';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseImportModal } from '@/components/expenses/ExpenseImportModal';
import { ExpenseByCategoryChart } from '@/components/expenses/ExpenseByCategoryChart';
import { CashFlowSankey } from '@/components/cashflow/CashFlowSankey';
import { Upload, Plus, Download, X, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';

const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#78716c',
];

type TabValue = 'all' | 'expenses' | 'income';

export const CashFlowPage = () => {
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
      // Tab filter
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

  // Calculate stats adapted to the active tab
  const stats = useMemo(() => {
    const getPreviousMonth = (monthStr: string) => {
      const [year, month] = monthStr.split('-').map(Number);
      const prevDate = new Date(year, month - 2, 1);
      return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    };

    const getMonthLabel = (monthStr: string) => {
      const [year, month] = monthStr.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    };

    // Filter by tab type first
    const tabExpenses = expenses.filter((e) => {
      if (activeTab === 'expenses') return !e.type || e.type === 'expense';
      if (activeTab === 'income') return e.type === 'income';
      return true;
    });

    // Also compute totals for "all" view (with currency conversion)
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
    const lastCompletedMonth = `${lastCompletedDate.getFullYear()}-${String(lastCompletedDate.getMonth() + 1).padStart(2, '0')}`;
    const lastCompletedLabel = lastCompletedDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    const previousDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
    const previousLabel = previousDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

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

  // Calculate category breakdown from filtered expenses (only for expense tabs or all)
  const categoryData = useMemo(() => {
    // For category chart, only show expense-type entries
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

  // Stat card colors based on tab
  const getStatColor = () => {
    if (activeTab === 'income') return 'text-green-600';
    if (activeTab === 'expenses') return 'text-destructive';
    return 'text-foreground';
  };

  // Show form if adding or editing
  if (showForm || editingExpense) {
    return (
      <div className="space-y-6">
        <ExpenseForm
          expense={editingExpense || undefined}
          categories={allCategories}
          onSubmit={editingExpense ? handleEditExpense : handleAddExpense}
          onSubmitRecurring={handleAddRecurring}
          onCancel={() => {
            setShowForm(false);
            setEditingExpense(null);
          }}
          defaultType={defaultFormType}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Cash Flow</h1>
          <p className="text-sm text-muted-foreground">
            Track your income and expenses
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="cursor-pointer hover:bg-secondary/80 transition-colors"
            onClick={toggleCurrency}
          >
            {displayCurrency}
          </Badge>
          <Button variant="outline" size="sm" onClick={exportAsCSV} className="min-h-[44px] sm:min-h-0 sm:size-default">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)} className="min-h-[44px] sm:min-h-0 sm:size-default">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950 min-h-[44px] sm:min-h-0 sm:size-default"
            onClick={() => {
              setDefaultFormType('income');
              setShowForm(true);
            }}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            New Income
          </Button>
          <Button size="sm" onClick={() => {
            setDefaultFormType('expense');
            setShowForm(true);
          }} className="min-h-[44px] sm:min-h-0 sm:size-default">
            <Plus className="mr-2 h-4 w-4" />
            New Expense
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            All
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5">
            <TrendingDown className="h-3.5 w-3.5" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="income" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Income
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stats */}
      {activeTab === 'all' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-green-600">
                +{formatCurrency(stats.totalIncome, displayCurrency)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-destructive">
                -{formatCurrency(stats.totalExpenses, displayCurrency)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-2xl font-bold ${stats.totalIncome - stats.totalExpenses >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {formatCurrency(stats.totalIncome - stats.totalExpenses, displayCurrency)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">
                {stats.totalCount}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {filterMonth !== 'all' ? 'Filtered Total' : 'Total'} ({stats.totalCount} transactions)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-2xl font-bold ${getStatColor()}`}>
                {activeTab === 'income' ? '+' : '-'}{formatCurrency(stats.totalAll, displayCurrency)}
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
              <div className={`text-lg sm:text-2xl font-bold ${getStatColor()}`}>
                {activeTab === 'income' ? '+' : '-'}{formatCurrency(stats.lastCompleted, displayCurrency)}
              </div>
              {stats.previous > 0 && (
                <p className={`text-xs ${stats.lastCompleted > stats.previous ? (activeTab === 'income' ? 'text-green-500' : 'text-destructive') : (activeTab === 'income' ? 'text-destructive' : 'text-green-500')}`}>
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
              <div className="text-lg sm:text-2xl font-bold text-muted-foreground">
                {activeTab === 'income' ? '+' : '-'}{formatCurrency(stats.previous, displayCurrency)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Chart (only for expenses or income tabs, or all-expense-only in all tab) */}
      {categoryData.data.length > 0 && (
        <ExpenseByCategoryChart
          data={categoryData.data}
          totalAmount={categoryData.total}
          currency={displayCurrency}
        />
      )}

      {/* Sankey Money Flow */}
      <CashFlowSankey 
        expenses={expenses} 
        currency={displayCurrency} 
        convert={convert}
        taxProvisionEnabled={settings.taxProvisionEnabled}
        taxRate={settings.taxRate}
      />

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-3">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-full md:w-[160px]">
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
          <SelectTrigger className="w-full md:w-[160px]">
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
          <SelectTrigger className="w-full md:w-[160px]">
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
          <div className="flex items-center gap-3 col-span-full md:col-span-1">
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
              <X className="mr-1 h-4 w-4" />
              Clear filters
            </Button>
            <span className="text-sm text-muted-foreground">
              {filteredExpenses.length} of {sortedExpenses.length} transactions
            </span>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'all' ? 'All Transactions' : activeTab === 'income' ? 'Income' : 'Expenses'}
            {hasActiveFilters ? ' (Filtered)' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ExpenseTable
            expenses={filteredExpenses}
            categories={allCategories}
            onEdit={(expense) => setEditingExpense(expense)}
            onDelete={deleteExpense}
            onClone={(expense) => {
              addExpense({
                ...expense,
                date: new Date().toISOString().split('T')[0],
                source: expense.source ? `${expense.source} (clone)` : 'manual (clone)',
              });
            }}
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
