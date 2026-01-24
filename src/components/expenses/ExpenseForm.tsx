import { useState } from 'react';
import type { Expense, Currency, BankProvider } from '@/types';
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
import { CategorySelect } from './CategorySelect';

interface ExpenseFormProps {
  expense?: Expense;
  categories: string[];
  onSubmit: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export const ExpenseForm = ({
  expense,
  categories,
  onSubmit,
  onCancel,
}: ExpenseFormProps) => {
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [currency, setCurrency] = useState<Currency>(expense?.currency || 'EUR');
  const [category, setCategory] = useState(expense?.category || '');
  const [source, setSource] = useState(expense?.source || '');
  const [merchantName, setMerchantName] = useState(expense?.merchantName || '');

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

    onSubmit({
      date,
      description: description.trim(),
      amount: parsedAmount,
      currency,
      category: category || undefined,
      source: source.trim(),
      sourceProvider: 'manual' as BankProvider,
      merchantName: merchantName.trim() || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{expense ? 'Edit Expense' : 'New Expense'}</CardTitle>
        <CardDescription>
          {expense ? 'Modify expense details' : 'Add a new expense manually'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g., Deblock, Bourso..."
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this expense for?"
              required
            />
          </div>

          <div>
            <Label htmlFor="merchantName">Merchant Name (optional)</Label>
            <Input
              id="merchantName"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="For auto-categorization"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <CategorySelect
              value={category}
              categories={categories}
              onChange={setCategory}
              placeholder="Select or create category"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {expense ? 'Update' : 'Add'} Expense
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
