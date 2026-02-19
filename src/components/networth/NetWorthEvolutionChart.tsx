import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Currency } from '@/schemas';
import type { NetWorthEvolution } from '@/types';
import { formatCurrency, formatCurrencyCompact } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExportableChart } from '@/components/ui/ExportableChart';
import { CHART_COLORS } from '@/utils/chartTheme';

interface NetWorthEvolutionChartProps {
  data: NetWorthEvolution[];
  currency: Currency;
  privacyMode?: boolean;
}


export const NetWorthEvolutionChart = ({
  data,
  currency,
  privacyMode = false,
}: NetWorthEvolutionChartProps) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Evolution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No snapshots yet. Add your first snapshot to see the evolution.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ExportableChart filename="net-worth-evolution">
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Evolution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => privacyMode ? '•••' : formatCurrencyCompact(value, currency)}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value, name) => [
                  privacyMode ? '•••••' : formatCurrency(value as number, currency),
                  name === 'stocks'
                    ? 'Stocks'
                    : name === 'crypto'
                    ? 'Crypto'
                    : name === 'cash'
                    ? 'Cash'
                    : name === 'stablecoins'
                    ? 'Stablecoins'
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
                  value === 'stocks'
                    ? 'Stocks'
                    : value === 'crypto'
                    ? 'Crypto'
                    : value === 'cash'
                    ? 'Cash'
                    : value === 'stablecoins'
                    ? 'Stablecoins'
                    : value
                }
              />
              <Area
                type="monotone"
                dataKey="stablecoins"
                stackId="1"
                stroke={CHART_COLORS.purple}
                fill={CHART_COLORS.purple}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="cash"
                stackId="1"
                stroke={CHART_COLORS.green}
                fill={CHART_COLORS.green}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="crypto"
                stackId="1"
                stroke={CHART_COLORS.amber}
                fill={CHART_COLORS.amber}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="stocks"
                stackId="1"
                stroke={CHART_COLORS.blue}
                fill={CHART_COLORS.blue}
                fillOpacity={0.6}
              />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </ExportableChart>
  );
};
