import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface CategorySelectProps {
  value?: string;
  categories: string[];
  onChange: (category: string) => void;
  placeholder?: string;
}

export const CategorySelect = ({
  value,
  categories,
  onChange,
  placeholder = 'Select category',
}: CategorySelectProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const handleCreateCategory = () => {
    if (newCategory.trim()) {
      onChange(newCategory.trim());
      setNewCategory('');
      setIsCreating(false);
    }
  };

  if (isCreating) {
    return (
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name..."
          className="flex-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreateCategory();
            }
            if (e.key === 'Escape') {
              setIsCreating(false);
              setNewCategory('');
            }
          }}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleCreateCategory} className="flex-1 sm:flex-none">
            Add
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsCreating(false);
              setNewCategory('');
            }}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
          {categories.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No categories yet
            </div>
          )}
        </SelectContent>
      </Select>
      <Button
        size="icon"
        variant="outline"
        onClick={() => setIsCreating(true)}
        title="Create new category"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};
