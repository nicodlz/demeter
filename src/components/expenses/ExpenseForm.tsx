import { useState } from 'react';
import type { Expense, ExpenseType, Currency, BankProvider } from '@/schemas';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CategorySelect } from './CategorySelect';

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Rental', 'Refund', 'Other'];
const INCOME_SOURCES = ['Employer', 'Client', 'Platform', 'Manual'];

interface ExpenseFormProps {
  expense?: Expense;
  categories: string[];
  onSubmit: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onSubmitRecurring?: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>, months: number) => void;
  onCancel: () => void;
  defaultType?: ExpenseType;
}

export const ExpenseForm = ({
  expense,
  categories,
  onSubmit,
  onSubmitRecurring,
  onCancel,
  defaultType = 'expense',
}: ExpenseFormProps) => {
  const { settings } = useSettings();
  const [entryType, setEntryType] = useState<ExpenseType>(expense?.type || defaultType);
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [currency, setCurrency] = useState<Currency>(expense?.currency || settings.defaultCurrency || 'USD');
  const [category, setCategory] = useState(expense?.category || '');
  const [source, setSource] = useState(expense?.source || '');
  const [merchantName, setMerchantName] = useState(expense?.merchantName || '');
  const [repeatMonthly, setRepeatMonthly] = useState(false);
  const [repeatMonths, setRepeatMonths] = useState('12');

  const isIncome = entryType === 'income';
  const effectiveCategories = isIncome ? INCOME_CATEGORIES : categories;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }

    if (!source.trim()) {
      alert('Please enter a source');
      return;
    }

    const data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> = {
      date,
      description: description.trim(),
      amount: parsedAmount,
      currency,
      category: category || undefined,
      source: source.trim(),
      sourceProvider: 'manual' as BankProvider,
      merchantName: merchantName.trim() || undefined,
      type: entryType,
    };

    if (isIncome && repeatMonthly && onSubmitRecurring) {
      const months = Math.min(24, Math.max(1, parseInt(repeatMonths) || 1));
      onSubmitRecurring(data, months);
    } else {
      onSubmit(data);
    }
  };

  const isEditing = !!expense;
  const typeLabel = isIncome ? 'Income' : 'Expense';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? `Edit ${typeLabel}` : `New ${typeLabel}`}</CardTitle>
        <CardDescription>
          {isEditing ? `Modify ${typeLabel.toLowerCase()} details` : `Add a new ${typeLabel.toLowerCase()} manually`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          {!isEditing && (
            <div>
              <Label>Type</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant={entryType === 'expense' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setEntryType('expense');
                    setCategory('');
                    setSource('');
                  }}
                  className={entryType === 'expense' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}
                >
                  Expense
                </Button>
                <Button
                  type="button"
                  variant={entryType === 'income' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setEntryType('income');
                    setCategory('');
                    setSource('');
                  }}
                  className={entryType === 'income' ? 'bg-green-600 hover:bg-green-600/90 text-white' : ''}
                >
                  Income
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              {isIncome ? (
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., Deblock, Bourso..."
                  required
                />
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isIncome ? 'e.g., Monthly salary' : 'What was this expense for?'}
              required
            />
          </div>

          {!isIncome && (
            <div>
              <Label htmlFor="merchantName">Merchant Name (optional)</Label>
              <Input
                id="merchantName"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder="For auto-categorization"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Category</Label>
            {isIncome ? (
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {INCOME_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <CategorySelect
                value={category}
                categories={effectiveCategories}
                onChange={setCategory}
                placeholder="Select or create category"
              />
            )}
          </div>

          {/* Repeat monthly option for income */}
          {isIncome && !isEditing && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="repeatMonthly"
                  checked={repeatMonthly}
                  onCheckedChange={(checked) => setRepeatMonthly(checked === true)}
                />
                <Label htmlFor="repeatMonthly" className="cursor-pointer">
                  Repeat monthly
                </Label>
              </div>
              {repeatMonthly && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="repeatMonths" className="text-sm whitespace-nowrap">
                    Number of months:
                  </Label>
                  <Input
                    id="repeatMonths"
                    type="number"
                    min="1"
                    max="24"
                    value={repeatMonths}
                    onChange={(e) => setRepeatMonths(e.target.value)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">(1–24)</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              className={isIncome ? 'bg-green-600 hover:bg-green-600/90 text-white' : ''}
            >
              {isEditing ? 'Update' : 'Add'} {typeLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
