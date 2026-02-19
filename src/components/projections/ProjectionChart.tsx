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
import type { ProjectionYear } from '@/utils/projections';
import type { Currency } from '@/schemas';
import { formatCurrency, formatCurrencyCompact } from '@/utils/formatters';
import { ExportableChart } from '@/components/ui/ExportableChart';

interface ProjectionChartProps {
  data: ProjectionYear[];
  currency: Currency;
}

export const ProjectionChart = ({ data, currency }: ProjectionChartProps) => {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No data to display
      </div>
    );
  }

  // Transform data for stacked area chart
  const chartData = data.map((item) => ({
    year: `Year ${item.year}`,
    contributed: item.totalContributed,
    gains: item.totalGains,
    total: item.totalValue,
  }));

  return (
    <ExportableChart filename="investment-projection">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12 }}
              tickLine={false}
              interval={Math.floor(data.length / 6)}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCurrencyCompact(value, currency)}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value, name) => [
                formatCurrency(value as number, currency),
                name === 'contributed'
                  ? 'Contributed'
                  : name === 'gains'
                  ? 'Gains'
                  : 'Total',
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
              }}
            />
            <Legend
              formatter={(value) =>
                value === 'contributed'
                  ? 'Contributed'
                  : value === 'gains'
                  ? 'Gains'
                  : 'Total'
              }
            />
            <Area
              type="monotone"
              dataKey="contributed"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="gains"
              stackId="1"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ExportableChart>
  );
};
