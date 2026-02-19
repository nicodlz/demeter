import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { ClientRevenue } from '@/hooks/useDashboardData';
import type { Currency } from '@/schemas';
import { formatCurrency } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExportableChart } from '@/components/ui/ExportableChart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';

interface ClientBreakdownProps {
  data: ClientRevenue[];
  currency: Currency;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

type SortField = 'totalTTC' | 'count' | 'percentage';
type SortOrder = 'asc' | 'desc';

export const ClientBreakdown = ({ data, currency }: ClientBreakdownProps) => {
  const [sortField, setSortField] = useState<SortField>('totalTTC');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Prepare pie chart data (top 5 + others)
  const pieData = (() => {
    if (data.length <= 6) {
      return data.map((client) => ({
        name: client.clientName,
        value: client.totalTTC,
      }));
    }

    const top5 = data.slice(0, 5);
    const others = data.slice(5);
    const othersTotal = others.reduce((sum, c) => sum + c.totalTTC, 0);

    return [
      ...top5.map((client) => ({
        name: client.clientName,
        value: client.totalTTC,
      })),
      { name: 'Others', value: othersTotal },
    ];
  })();

  // Sort table data
  const sortedData = [...data].sort((a, b) => {
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    return (a[sortField] - b[sortField]) * multiplier;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortOrder === 'desc' ? (
      <ArrowDown className="h-4 w-4 text-primary" />
    ) : (
      <ArrowUp className="h-4 w-4 text-primary" />
    );
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No data for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ExportableChart filename="revenue-by-client">
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value as number, currency)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('count')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Invoices
                      <SortIcon field="count" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('totalTTC')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Total
                      <SortIcon field="totalTTC" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('percentage')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      %
                      <SortIcon field="percentage" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((client, index) => (
                  <TableRow key={client.clientId}>
                    <TableCell>
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <span className="text-sm">{client.clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {client.count}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(client.totalTTC, currency)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {client.percentage.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </div>
        </CardContent>
      </Card>
    </ExportableChart>
  );
};
