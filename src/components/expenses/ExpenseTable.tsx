import { useState, useMemo } from 'react';
import type { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';
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
import { MoreHorizontal, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { CategoryPicker } from './CategoryPicker';

type SortField = 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

interface ExpenseTableProps {
  expenses: Expense[];
  categories: string[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onCategorySelect: (expenseId: string, category: string) => void;
}

export const ExpenseTable = ({
  expenses,
  categories,
  onEdit,
  onDelete,
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
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Source</TableHead>
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
            <TableCell className="font-medium">
              {formatDate(expense.date)}
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
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {expense.source}
              </span>
            </TableCell>
            <TableCell className="text-right font-medium text-destructive">
              -{formatCurrency(expense.amount, expense.currency)}
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
  );
};
