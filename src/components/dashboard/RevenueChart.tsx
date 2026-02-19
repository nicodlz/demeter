import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import type { MonthlyRevenue } from '@/hooks/useDashboardData';
import type { Currency } from '@/schemas';
import { formatCurrency, formatCurrencyCompact } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExportableChart } from '@/components/ui/ExportableChart';
import { CHART_COLORS } from '@/utils/chartTheme';

interface RevenueChartProps {
  data: MonthlyRevenue[];
  currency: Currency;
}

export const RevenueChart = ({ data, currency }: RevenueChartProps) => {
  // Calculate cumulative TTC for trend line
  let cumulative = 0;
  const chartData = data.map((item) => {
    cumulative += item.ttc;
    return {
      ...item,
      cumulative,
    };
  });

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No data for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ExportableChart filename="monthly-revenue">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatCurrencyCompact(value, currency)}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatCurrencyCompact(value, currency)}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(value as number, currency),
                    name === 'ht'
                      ? 'Excl. VAT'
                      : name === 'vat'
                      ? 'VAT'
                      : name === 'cumulative'
                      ? 'Cumulative'
                      : String(name),
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === 'ht'
                      ? 'Excl. VAT'
                      : value === 'vat'
                      ? 'VAT'
                      : value === 'cumulative'
                      ? 'Cumulative'
                      : value
                  }
                />
                <Bar
                  yAxisId="left"
                  dataKey="ht"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  name="ht"
                />
                <Bar
                  yAxisId="left"
                  dataKey="vat"
                  fill={CHART_COLORS.green}
                  radius={[4, 4, 0, 0]}
                  name="vat"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  stroke={CHART_COLORS.amber}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.amber, strokeWidth: 2 }}
                  name="cumulative"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </ExportableChart>
  );
};
