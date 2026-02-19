import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExportableChart } from '@/components/ui/ExportableChart';
import type { ExpenseMonthlyData } from '@/hooks/useExpensesDashboard';
import type { Currency } from '@/schemas';

interface ExpenseEvolutionChartProps {
  data: ExpenseMonthlyData[];
  currency: Currency;
  privacyMode?: boolean;
}

export const ExpenseEvolutionChart = ({ data, currency, privacyMode = false }: ExpenseEvolutionChartProps) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Expenses</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Import expenses to see the evolution
        </CardContent>
      </Card>
    );
  }

  // Calculate average for highlighting (last 4 completed months, excluding current month)
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const completedMonths = data.filter(d => d.month < currentMonth);
  const last4Months = completedMonths.slice(-4);
  const avg = last4Months.length > 0
    ? last4Months.reduce((sum, d) => sum + d.total, 0) / last4Months.length
    : 0;

  return (
    <ExportableChart filename="monthly-expenses">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Expenses</CardTitle>
          <CardDescription>
            Spending over time • Avg: {privacyMode ? '•••••' : formatCurrency(avg, currency)}/month
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
                  tickFormatter={(value) => privacyMode ? '•••' : `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as ExpenseMonthlyData;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium">{d.monthLabel}</p>
                        <p className="text-destructive font-bold">
                          {privacyMode ? '•••••' : formatCurrency(d.total, currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.count} transactions
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.total > avg ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))'}
                      fillOpacity={entry.total > avg ? 1 : 0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </ExportableChart>
  );
};
