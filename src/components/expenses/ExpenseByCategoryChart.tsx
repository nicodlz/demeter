import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExportableChart } from '@/components/ui/ExportableChart';
import type { ExpenseCategoryData } from '@/hooks/useExpensesDashboard';
import type { Currency } from '@/schemas';

interface ExpenseByCategoryChartProps {
  data: ExpenseCategoryData[];
  totalAmount: number;
  currency: Currency;
  privacyMode?: boolean;
}

// Transform data for recharts compatibility
interface ChartData {
  category: string;
  total: number;
  count: number;
  percentage: number;
  color: string;
  [key: string]: string | number;
}

export const ExpenseByCategoryChart = ({ data, totalAmount, currency, privacyMode = false }: ExpenseByCategoryChartProps) => {
  // Convert to chart-compatible format
  const chartData: ChartData[] = data.map((d) => ({ ...d }));
  const mask = (value: string) => privacyMode ? '•••••' : value;
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>By Category</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Categorize expenses to see breakdown
        </CardContent>
      </Card>
    );
  }

  return (
    <ExportableChart filename="expenses-by-category">
      <Card>
        <CardHeader>
          <CardTitle>By Category</CardTitle>
          <CardDescription>
            {data.length} categories • Total: {mask(formatCurrency(totalAmount, currency))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
          <div className="h-[200px] lg:h-[250px] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as ChartData;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium">{d.category}</p>
                        <p className="text-destructive font-bold">
                          {mask(formatCurrency(d.total, currency))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.percentage.toFixed(1)}% • {d.count} transactions
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2 max-h-[250px] overflow-auto">
            {data.slice(0, 8).map((cat) => (
              <div key={cat.category} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  // style kept: cat.color is a hex value from useExpensesDashboard's
                  // CATEGORY_COLORS array, shared with Recharts <Cell fill>. A separate
                  // Tailwind BG class mapping would duplicate color definitions across
                  // the hook and component.
                  style={{ backgroundColor: cat.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm truncate">{cat.category}</span>
                    <span className="text-sm font-medium ml-2">
                      {mask(formatCurrency(cat.total, currency))}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                    <div
                      className="h-1.5 rounded-full"
                      // style kept: both values are runtime-computed from data —
                      // width is a dynamic percentage, backgroundColor is a hex color
                      // shared with Recharts <Cell fill>. Neither can be expressed as
                      // static Tailwind classes.
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          </div>
        </CardContent>
      </Card>
    </ExportableChart>
  );
};
