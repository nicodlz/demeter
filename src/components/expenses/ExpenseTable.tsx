import { useState, useMemo } from 'react';
import type { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Pencil, Trash2, Copy, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { CategoryPicker } from './CategoryPicker';

type SortField = 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

interface ExpenseTableProps {
  expenses: Expense[];
  categories: string[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onClone: (expense: Expense) => void;
  onCategorySelect: (expenseId: string, category: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Mobile card for a single expense                                   */
/* ------------------------------------------------------------------ */
const ExpenseCard = ({
  expense,
  categories,
  onEdit,
  onDelete,
  onClone,
  onCategorySelect,
}: {
  expense: Expense;
  categories: string[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onClone: (expense: Expense) => void;
  onCategorySelect: (expenseId: string, category: string) => void;
}) => {
  const isIncome = expense.type === 'income';

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Row 1: Date + type badge … amount + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium whitespace-nowrap">
            {formatDate(expense.date)}
          </span>
          {isIncome ? (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5 shrink-0">
              Income
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px] px-1.5 shrink-0">
              Expense
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-sm font-semibold whitespace-nowrap ${
              isIncome ? 'text-green-600' : 'text-destructive'
            }`}
          >
            {isIncome ? '+' : '-'}
            {formatCurrency(expense.amount, expense.currency)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 -mr-2">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(expense)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onClone(expense)}>
                <Copy className="mr-2 h-4 w-4" />
                Clone
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete expense?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this expense. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(expense.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Row 2: Description (+ merchant) */}
      <div className="min-w-0">
        <p className="text-sm truncate" title={expense.description}>
          {expense.description}
        </p>
        {expense.merchantName && expense.merchantName !== expense.description && (
          <p className="text-xs text-muted-foreground truncate">
            {expense.merchantName}
          </p>
        )}
      </div>

      {/* Row 3: Category — always visible, prominent */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground shrink-0">Category:</span>
        <CategoryPicker
          currentCategory={expense.category}
          categories={categories}
          onSelect={(category) => onCategorySelect(expense.id, category)}
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export const ExpenseTable = ({
  expenses,
  categories,
  onEdit,
  onDelete,
  onClone,
  onCategorySelect,
}: ExpenseTableProps) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [expenses, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  if (expenses.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No expenses yet. Import from your bank or add manually.
      </div>
    );
  }

  return (
    <>
      {/* ========== MOBILE: Card layout (< md) ========== */}
      <div className="md:hidden space-y-3">
        {/* Sort controls */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">Sort:</span>
          <button
            className="flex items-center text-xs font-medium hover:text-foreground transition-colors min-h-[44px] px-1"
            onClick={() => handleSort('date')}
          >
            Date
            <SortIcon field="date" />
          </button>
          <button
            className="flex items-center text-xs font-medium hover:text-foreground transition-colors min-h-[44px] px-1"
            onClick={() => handleSort('amount')}
          >
            Amount
            <SortIcon field="amount" />
          </button>
        </div>

        {sortedExpenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            categories={categories}
            onEdit={onEdit}
            onDelete={onDelete}
            onClone={onClone}
            onCategorySelect={onCategorySelect}
          />
        ))}
      </div>

      {/* ========== DESKTOP: Table layout (≥ md) ========== */}
      <div className="hidden md:block overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                className="flex items-center hover:text-foreground transition-colors"
                onClick={() => handleSort('date')}
              >
                Date
                <SortIcon field="date" />
              </button>
            </TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="hidden lg:table-cell">Source</TableHead>
            <TableHead className="text-right">
              <button
                className="flex items-center ml-auto hover:text-foreground transition-colors"
                onClick={() => handleSort('amount')}
              >
                Amount
                <SortIcon field="amount" />
              </button>
            </TableHead>
            <TableHead className="text-right w-[50px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedExpenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell className="font-medium whitespace-nowrap">
                {formatDate(expense.date)}
              </TableCell>
              <TableCell>
                {expense.type === 'income' ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                    Income
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    Expense
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="max-w-[300px] truncate" title={expense.description}>
                  {expense.description}
                </div>
                {expense.merchantName && expense.merchantName !== expense.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {expense.merchantName}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <CategoryPicker
                  currentCategory={expense.category}
                  categories={categories}
                  onSelect={(category) => onCategorySelect(expense.id, category)}
                />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span className="text-sm text-muted-foreground">
                  {expense.source}
                </span>
              </TableCell>
              <TableCell className={`text-right font-medium whitespace-nowrap ${expense.type === 'income' ? 'text-green-600' : 'text-destructive'}`}>
                {expense.type === 'income' ? '+' : '-'}{formatCurrency(expense.amount, expense.currency)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(expense)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onClone(expense)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Clone
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete expense?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this expense. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(expense.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </>
  );
};
