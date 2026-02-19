import { formatCurrency } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Scale, PiggyBank } from 'lucide-react';
import type { Currency } from '@/schemas';

interface CashFlowStatsCardsProps {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  currency: Currency;
  privacyMode?: boolean;
}

export const CashFlowStatsCards = ({
  totalIncome,
  totalExpenses,
  balance,
  savingsRate,
  currency,
  privacyMode = false,
}: CashFlowStatsCardsProps) => {
  const mask = (value: string) => (privacyMode ? '•••••' : value);
  const isPositiveBalance = balance >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Income</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-2xl font-bold text-green-600">
            {mask(`+${formatCurrency(totalIncome, currency)}`)}
          </div>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-2xl font-bold text-destructive">
            {mask(`-${formatCurrency(totalExpenses, currency)}`)}
          </div>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Balance</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-lg sm:text-2xl font-bold ${isPositiveBalance ? 'text-green-600' : 'text-destructive'}`}
          >
            {mask(formatCurrency(balance, currency))}
          </div>
          <p className="text-xs text-muted-foreground">Income − Expenses</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-lg sm:text-2xl font-bold ${savingsRate >= 0 ? 'text-green-600' : 'text-destructive'}`}
          >
            {privacyMode ? '•••••' : `${savingsRate.toFixed(1)}%`}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalIncome > 0 ? 'Of income saved' : 'No income recorded'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
