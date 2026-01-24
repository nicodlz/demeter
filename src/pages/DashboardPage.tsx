import { useState, useMemo } from 'react';
import { useNetWorthDashboard } from '@/hooks/useNetWorthDashboard';
import { useExpensesDashboard } from '@/hooks/useExpensesDashboard';
import { useSettings } from '@/hooks/useSettings';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { NetWorthStatsCards } from '@/components/networth/NetWorthStatsCards';
import { NetWorthEvolutionChart } from '@/components/networth/NetWorthEvolutionChart';
import { AllocationPieChart } from '@/components/networth/AllocationPieChart';
import { ExpenseStatsCards } from '@/components/expenses/ExpenseStatsCards';
import { ExpenseEvolutionChart } from '@/components/expenses/ExpenseEvolutionChart';
import { ExpenseByCategoryChart } from '@/components/expenses/ExpenseByCategoryChart';
import { TopMerchantsCard } from '@/components/expenses/TopMerchantsCard';
import type { Currency } from '@/types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff } from 'lucide-react';

type DateRange = 'all' | '30d' | '90d' | '6m' | '1y' | 'ytd';

const getDateRange = (range: DateRange): { start?: string; end?: string } => {
  const now = new Date();
  const end = now.toISOString().split('T')[0];

  switch (range) {
    case '30d': {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start: start.toISOString().split('T')[0], end };
    }
    case '90d': {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { start: start.toISOString().split('T')[0], end };
    }
    case '6m': {
      const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      return { start: start.toISOString().split('T')[0], end };
    }
    case '1y': {
      const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      return { start: start.toISOString().split('T')[0], end };
    }
    case 'ytd': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: start.toISOString().split('T')[0], end };
    }
    default:
      return {};
  }
};

export const DashboardPage = () => {
  const { settings, updateSettings } = useSettings();
  const { convert } = useExchangeRate();
  const displayCurrency: Currency = settings.dashboardCurrency || 'USD';

  const toggleCurrency = () => {
    const newCurrency: Currency = displayCurrency === 'USD' ? 'EUR' : 'USD';
    updateSettings({ dashboardCurrency: newCurrency });
  };

  const privacyMode = settings.privacyMode ?? false;
  const togglePrivacy = () => {
    updateSettings({ privacyMode: !privacyMode });
  };
  const [expenseDateRange, setExpenseDateRange] = useState<DateRange>('all');

  const networthStats = useNetWorthDashboard();

  const { start, end } = useMemo(() => getDateRange(expenseDateRange), [expenseDateRange]);
  const expenseStats = useExpensesDashboard(start, end, displayCurrency, convert);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your finances
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePrivacy}
            className="h-8 w-8"
            title={privacyMode ? 'Show amounts' : 'Hide amounts'}
          >
            {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Badge
            variant="secondary"
            className="cursor-pointer hover:bg-secondary/80 transition-colors"
            onClick={toggleCurrency}
          >
            {displayCurrency}
          </Badge>
        </div>
      </div>

      {/* Net Worth Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Net Worth</h3>
        <NetWorthStatsCards
          totalNetWorth={networthStats.totalNetWorth}
          snapshotCount={networthStats.snapshotCount}
          changeFromPrevious={networthStats.changeFromPrevious}
          changePercentage={networthStats.changePercentage}
          currency={displayCurrency}
          privacyMode={privacyMode}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NetWorthEvolutionChart
            data={networthStats.evolution}
            currency={displayCurrency}
            privacyMode={privacyMode}
          />
          <AllocationPieChart
            data={networthStats.allocation}
            currency={displayCurrency}
            totalNetWorth={networthStats.totalNetWorth}
            privacyMode={privacyMode}
          />
        </div>
      </section>

      <Separator />

      {/* Expenses Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Expenses</h3>
          <Select value={expenseDateRange} onValueChange={(v) => setExpenseDateRange(v as DateRange)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ExpenseStatsCards
          totalAmount={expenseStats.totalAmount}
          totalCount={expenseStats.totalCount}
          avgPerTransaction={expenseStats.avgPerTransaction}
          dailyAverage={expenseStats.dailyAverage}
          lastCompletedMonth={expenseStats.lastCompletedMonth}
          previousMonth={expenseStats.previousMonth}
          monthOverMonthChange={expenseStats.monthOverMonthChange}
          monthOverMonthPercentage={expenseStats.monthOverMonthPercentage}
          currency={displayCurrency}
          privacyMode={privacyMode}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpenseEvolutionChart data={expenseStats.monthlyData} currency={displayCurrency} privacyMode={privacyMode} />
          <ExpenseByCategoryChart
            data={expenseStats.categoryData}
            totalAmount={expenseStats.totalAmount}
            currency={displayCurrency}
            privacyMode={privacyMode}
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <TopMerchantsCard merchants={expenseStats.topMerchants} currency={displayCurrency} privacyMode={privacyMode} />
        </div>
      </section>
    </div>
  );
};
