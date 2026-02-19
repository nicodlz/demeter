import { useCashFlowPage } from '@/hooks/useCashFlowPage';
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

export const CashFlowPage = () => {
  const {
    settings,
    displayCurrency,
    toggleCurrency,
    expenses,
    addExpense,
    deleteExpense,
    findDuplicates,
    exportAsCSV,
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
    filterMonth,
    setFilterMonth,
    filterSource,
    setFilterSource,
    filterCategory,
    setFilterCategory,
    hasActiveFilters,
    clearFilters,
    allCategories,
    availableMonths,
    availableSources,
    sortedExpenses,
    filteredExpenses,
    stats,
    categoryData,
    formatMonth,
    getStatColor,
    handleAddExpense,
    handleAddRecurring,
    handleEditExpense,
    handleImport,
    handleCategorySelect,
    convert,
  } = useCashFlowPage();

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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
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

      {/* Category Chart */}
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
