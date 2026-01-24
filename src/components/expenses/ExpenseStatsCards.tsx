import { formatCurrency } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Wallet, Calendar, CreditCard, Calculator } from 'lucide-react';
import type { Currency } from '@/types';

interface ExpenseStatsCardsProps {
  totalAmount: number;
  totalCount: number;
  avgPerTransaction: number;
  dailyAverage: number;
  lastCompletedMonth: { total: number; count: number; label: string };
  previousMonth: { total: number; count: number; label: string };
  monthOverMonthChange: number;
  monthOverMonthPercentage: number;
  currency: Currency;
  privacyMode?: boolean;
}

export const ExpenseStatsCards = ({
  totalAmount,
  totalCount,
  avgPerTransaction,
  dailyAverage,
  lastCompletedMonth,
  previousMonth,
  monthOverMonthChange,
  monthOverMonthPercentage,
  currency,
  privacyMode = false,
}: ExpenseStatsCardsProps) => {
  const isIncrease = monthOverMonthChange > 0;
  const mask = (value: string) => privacyMode ? '•••••' : value;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{mask(formatCurrency(totalAmount, currency))}</div>
          <p className="text-xs text-muted-foreground">{totalCount} transactions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{lastCompletedMonth.label}</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{mask(formatCurrency(lastCompletedMonth.total, currency))}</div>
          <p className="text-xs text-muted-foreground">{lastCompletedMonth.count} transactions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">vs {previousMonth.label}</CardTitle>
          {isIncrease ? (
            <TrendingUp className="h-4 w-4 text-destructive" />
          ) : (
            <TrendingDown className="h-4 w-4 text-green-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isIncrease ? 'text-destructive' : 'text-green-500'}`}>
            {mask(`${isIncrease ? '+' : ''}${formatCurrency(monthOverMonthChange, currency)}`)}
          </div>
          <p className="text-xs text-muted-foreground">
            {isIncrease ? '+' : ''}{monthOverMonthPercentage.toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{previousMonth.label}</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">{mask(formatCurrency(previousMonth.total, currency))}</div>
          <p className="text-xs text-muted-foreground">{previousMonth.count} transactions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Daily Avg</CardTitle>
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{mask(formatCurrency(dailyAverage, currency))}</div>
          <p className="text-xs text-muted-foreground">per day</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg/Transaction</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{mask(formatCurrency(avgPerTransaction, currency))}</div>
          <p className="text-xs text-muted-foreground">per transaction</p>
        </CardContent>
      </Card>
    </div>
  );
};
