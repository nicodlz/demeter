import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExportableChart } from '@/components/ui/ExportableChart';
import type { CashFlowMonthlyData } from '@/hooks/useCashFlowDashboard';
import type { Currency } from '@/types';

interface CashFlowChartProps {
  data: CashFlowMonthlyData[];
  currency: Currency;
  privacyMode?: boolean;
}

export const CashFlowChart = ({ data, currency, privacyMode = false }: CashFlowChartProps) => {
  if (data.length === 0 || data.every((d) => d.income === 0 && d.expenses === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Add income and expenses to see the cash flow chart
        </CardContent>
      </Card>
    );
  }

  // Average balance of months that have data
  const monthsWithData = data.filter((d) => d.income > 0 || d.expenses > 0);
  const avgBalance =
    monthsWithData.length > 0
      ? monthsWithData.reduce((sum, d) => sum + d.balance, 0) / monthsWithData.length
      : 0;

  return (
    <ExportableChart filename="cashflow">
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow</CardTitle>
          <CardDescription>
            Income vs Expenses (last 12 months) • Avg balance:{' '}
            {privacyMode ? '•••••' : formatCurrency(avgBalance, currency)}/month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    privacyMode ? '•••' : `${(value / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as CashFlowMonthlyData;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium">{d.monthLabel}</p>
                        <p className="text-green-600">
                          Income: {privacyMode ? '•••••' : formatCurrency(d.income, currency)}
                        </p>
                        <p className="text-destructive">
                          Expenses: {privacyMode ? '•••••' : formatCurrency(d.expenses, currency)}
                        </p>
                        <p
                          className={`font-bold ${d.balance >= 0 ? 'text-green-600' : 'text-destructive'}`}
                        >
                          Balance: {privacyMode ? '•••••' : formatCurrency(d.balance, currency)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="hsl(var(--destructive))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </ExportableChart>
  );
};
