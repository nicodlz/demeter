import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Sankey, Tooltip, Rectangle } from 'recharts';
import type { Expense, Currency } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NodeProps, LinkProps } from 'recharts/types/chart/Sankey';

// ── colour palette ──────────────────────────────────────────
const INCOME_COLOR = '#22c55e'; // green-500
const TOTAL_COLOR = '#6366f1'; // indigo-500
const EXPENSE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#e11d48', '#d946ef',
  '#a855f7', '#ec4899', '#f43f5e', '#fb923c', '#78716c',
];
const SAVINGS_COLOR = '#3b82f6'; // blue-500

// ── helpers ─────────────────────────────────────────────────

/** Extract client name from an invoice-sourced income description. */
function extractClientName(expense: Expense): string {
  // Pattern: "Invoice XXX - ClientName" or similar
  const match = expense.description.match(/Invoice\s+\S+\s*[-–—]\s*(.+)/i);
  if (match) return match[1].trim();

  // Also try "ClientName - Invoice XXX"
  const match2 = expense.description.match(/^(.+?)\s*[-–—]\s*Invoice/i);
  if (match2) return match2[1].trim();

  return 'Other Income';
}

function getIncomeSourceLabel(expense: Expense): string {
  if (expense.sourceProvider === 'invoice') {
    return extractClientName(expense);
  }
  return 'Other Income';
}

function getNodeColor(name: string, expenseCategoryColorMap: Map<string, string>): string {
  if (name === 'Total') return TOTAL_COLOR;
  if (name === 'Savings') return SAVINGS_COLOR;
  if (expenseCategoryColorMap.has(name)) return expenseCategoryColorMap.get(name)!;
  // Income source nodes
  return INCOME_COLOR;
}

interface SankeyData {
  nodes: { name: string }[];
  links: { source: number; target: number; value: number }[];
}

function buildSankeyData(expenses: Expense[]): SankeyData | null {
  const incomes = expenses.filter((e) => e.type === 'income');
  const expenseItems = expenses.filter((e) => !e.type || e.type === 'expense');

  const totalIncome = incomes.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = expenseItems.reduce((s, e) => s + e.amount, 0);

  if (totalIncome === 0 && totalExpenses === 0) return null;

  // Group incomes by source label
  const incomeBySource = new Map<string, number>();
  for (const inc of incomes) {
    const label = getIncomeSourceLabel(inc);
    incomeBySource.set(label, (incomeBySource.get(label) ?? 0) + inc.amount);
  }

  // Group expenses by category
  const expenseByCategory = new Map<string, number>();
  for (const exp of expenseItems) {
    const cat = exp.category || 'Uncategorized';
    expenseByCategory.set(cat, (expenseByCategory.get(cat) ?? 0) + exp.amount);
  }

  // Build nodes: income sources → Total → expense categories [+ Savings]
  const nodes: { name: string }[] = [];
  const links: { source: number; target: number; value: number }[] = [];

  // Income source nodes
  const incomeSources = Array.from(incomeBySource.entries()).sort((a, b) => b[1] - a[1]);
  for (const [label] of incomeSources) {
    nodes.push({ name: label });
  }

  // Total node
  const totalIdx = nodes.length;
  nodes.push({ name: 'Total' });

  // Links: income sources → Total
  for (let i = 0; i < incomeSources.length; i++) {
    links.push({ source: i, target: totalIdx, value: incomeSources[i][1] });
  }

  // Expense category nodes
  const expenseCategories = Array.from(expenseByCategory.entries()).sort((a, b) => b[1] - a[1]);
  const firstExpenseIdx = nodes.length;
  for (const [cat] of expenseCategories) {
    nodes.push({ name: cat });
  }

  // Links: Total → expense categories
  for (let i = 0; i < expenseCategories.length; i++) {
    // Cap each expense link at totalIncome to avoid Sankey rendering issues
    const value = Math.min(expenseCategories[i][1], totalIncome > 0 ? expenseCategories[i][1] : expenseCategories[i][1]);
    links.push({ source: totalIdx, target: firstExpenseIdx + i, value });
  }

  // Savings node if income > expenses
  const savings = totalIncome - totalExpenses;
  if (savings > 0) {
    const savingsIdx = nodes.length;
    nodes.push({ name: 'Savings' });
    links.push({ source: totalIdx, target: savingsIdx, value: savings });
  }

  // Sankey requires at least 1 link with value > 0
  if (links.length === 0 || links.every((l) => l.value <= 0)) return null;
  // Filter out zero-value links
  const filteredLinks = links.filter((l) => l.value > 0);
  if (filteredLinks.length === 0) return null;

  return { nodes, links: filteredLinks };
}

// ── custom renderers ────────────────────────────────────────

function CustomNode({
  x,
  y,
  width,
  height,
  payload,
  expenseCategoryColorMap,
}: NodeProps & { expenseCategoryColorMap: Map<string, string> }) {
  const name: string = (payload as { name: string }).name ?? '';
  const fill = getNodeColor(name, expenseCategoryColorMap);

  return (
    <g>
      <Rectangle x={x} y={y} width={width} height={height} fill={fill} radius={2} />
      <text
        x={x + width + 6}
        y={y + height / 2}
        textAnchor="start"
        dominantBaseline="central"
        fontSize={12}
        fill="currentColor"
        className="text-foreground"
      >
        {name}
      </text>
    </g>
  );
}

function CustomLink({
  sourceX,
  targetX,
  sourceY,
  targetY,
  sourceControlX,
  targetControlX,
  linkWidth,
  payload,
  expenseCategoryColorMap,
}: LinkProps & { expenseCategoryColorMap: Map<string, string> }) {
  const sourceNode = (payload as { source: { name: string } }).source;
  const targetNode = (payload as { target: { name: string } }).target;
  const sourceName = sourceNode?.name ?? '';
  const targetName = targetNode?.name ?? '';

  // Determine colour from the non-Total end
  let color: string;
  if (targetName === 'Total') {
    color = INCOME_COLOR;
  } else if (targetName === 'Savings') {
    color = SAVINGS_COLOR;
  } else if (expenseCategoryColorMap.has(targetName)) {
    color = expenseCategoryColorMap.get(targetName)!;
  } else if (sourceName === 'Total') {
    color = '#ef4444';
  } else {
    color = INCOME_COLOR;
  }

  return (
    <path
      d={`
        M${sourceX},${sourceY}
        C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
      `}
      fill="none"
      stroke={color}
      strokeWidth={linkWidth}
      strokeOpacity={0.3}
      onMouseEnter={(e) => {
        (e.target as SVGPathElement).setAttribute('stroke-opacity', '0.6');
      }}
      onMouseLeave={(e) => {
        (e.target as SVGPathElement).setAttribute('stroke-opacity', '0.3');
      }}
    />
  );
}

// ── main component ──────────────────────────────────────────

interface CashFlowSankeyProps {
  expenses: Expense[];
  currency?: Currency;
}

export const CashFlowSankey = ({ expenses, currency = 'EUR' }: CashFlowSankeyProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  // Responsive sizing
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth;
      setDimensions({ width: Math.max(w, 300), height: Math.max(Math.min(w * 0.5, 500), 300) });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateDimensions]);

  // Month filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    expenses.forEach((e) => months.add(e.date.substring(0, 7)));
    return Array.from(months).sort().reverse();
  }, [expenses]);

  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const filteredExpenses = useMemo(() => {
    if (selectedMonth === 'all') return expenses;
    return expenses.filter((e) => e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  const sankeyData = useMemo(() => buildSankeyData(filteredExpenses), [filteredExpenses]);

  // Build colour map for expense categories
  const expenseCategoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!sankeyData) return map;
    // Expense category nodes are those that are targets of links from Total
    const totalIdx = sankeyData.nodes.findIndex((n) => n.name === 'Total');
    const expenseNodeIdxs = sankeyData.links
      .filter((l) => l.source === totalIdx && sankeyData.nodes[l.target]?.name !== 'Savings')
      .map((l) => l.target);
    expenseNodeIdxs.forEach((idx, i) => {
      map.set(sankeyData.nodes[idx].name, EXPENSE_COLORS[i % EXPENSE_COLORS.length]);
    });
    return map;
  }, [sankeyData]);

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (!sankeyData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Money Flow</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
          Add income and expenses to see the money flow diagram
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Money Flow</CardTitle>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            {availableMonths.map((month) => (
              <SelectItem key={month} value={month}>
                {formatMonth(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="w-full overflow-hidden">
          <Sankey
            width={dimensions.width}
            height={dimensions.height}
            data={sankeyData}
            nodeWidth={12}
            nodePadding={14}
            linkCurvature={0.5}
            iterations={32}
            margin={{ top: 10, right: 140, bottom: 10, left: 10 }}
            node={(props: NodeProps) => (
              <CustomNode {...props} expenseCategoryColorMap={expenseCategoryColorMap} />
            )}
            link={(props: LinkProps) => (
              <CustomLink {...props} expenseCategoryColorMap={expenseCategoryColorMap} />
            )}
          >
            <Tooltip
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;
                const item = payload[0]?.payload;
                if (!item) return null;

                // Node tooltip
                if ('name' in item && !('source' in item && 'target' in item)) {
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-medium">{item.name}</p>
                      <p>{formatCurrency(item.value ?? 0, currency)}</p>
                    </div>
                  );
                }

                // Link tooltip
                const source = item.source as { name: string } | undefined;
                const target = item.target as { name: string } | undefined;
                return (
                  <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                    <p className="font-medium">
                      {source?.name ?? '?'} → {target?.name ?? '?'}
                    </p>
                    <p>{formatCurrency(item.value ?? 0, currency)}</p>
                  </div>
                );
              }}
            />
          </Sankey>
        </div>
      </CardContent>
    </Card>
  );
};
