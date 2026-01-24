import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus } from 'lucide-react';

// Predefined colors for categories (will cycle through)
const CATEGORY_COLORS = [
  { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', hover: 'hover:bg-red-200 dark:hover:bg-red-900/50' },
  { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', hover: 'hover:bg-orange-200 dark:hover:bg-orange-900/50' },
  { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', hover: 'hover:bg-amber-200 dark:hover:bg-amber-900/50' },
  { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', hover: 'hover:bg-yellow-200 dark:hover:bg-yellow-900/50' },
  { bg: 'bg-lime-100 dark:bg-lime-900/30', text: 'text-lime-700 dark:text-lime-300', hover: 'hover:bg-lime-200 dark:hover:bg-lime-900/50' },
  { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', hover: 'hover:bg-green-200 dark:hover:bg-green-900/50' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-900/50' },
  { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', hover: 'hover:bg-teal-200 dark:hover:bg-teal-900/50' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', hover: 'hover:bg-cyan-200 dark:hover:bg-cyan-900/50' },
  { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', hover: 'hover:bg-sky-200 dark:hover:bg-sky-900/50' },
  { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', hover: 'hover:bg-blue-200 dark:hover:bg-blue-900/50' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', hover: 'hover:bg-indigo-200 dark:hover:bg-indigo-900/50' },
  { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', hover: 'hover:bg-violet-200 dark:hover:bg-violet-900/50' },
  { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', hover: 'hover:bg-purple-200 dark:hover:bg-purple-900/50' },
  { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', text: 'text-fuchsia-700 dark:text-fuchsia-300', hover: 'hover:bg-fuchsia-200 dark:hover:bg-fuchsia-900/50' },
  { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', hover: 'hover:bg-pink-200 dark:hover:bg-pink-900/50' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', hover: 'hover:bg-rose-200 dark:hover:bg-rose-900/50' },
];

// Get consistent color for a category based on its name
const getCategoryColor = (category: string, allCategories: string[]) => {
  const sortedCategories = [...allCategories].sort();
  const index = sortedCategories.indexOf(category);
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
};

interface CategoryPickerProps {
  currentCategory?: string;
  categories: string[];
  onSelect: (category: string) => void;
}

export const CategoryPicker = ({
  currentCategory,
  categories,
  onSelect,
}: CategoryPickerProps) => {
  const [open, setOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedCategories = [...categories].sort();

  useEffect(() => {
    if (open && inputRef.current) {
      // Small delay to ensure popover is rendered
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = (category: string) => {
    onSelect(category);
    setOpen(false);
    setNewCategory('');
  };

  const handleAddNew = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !categories.includes(trimmed)) {
      onSelect(trimmed);
      setOpen(false);
      setNewCategory('');
    } else if (trimmed && categories.includes(trimmed)) {
      // Category exists, just select it
      handleSelect(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNew();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {currentCategory ? (
          <button
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors ${
              getCategoryColor(currentCategory, categories).bg
            } ${getCategoryColor(currentCategory, categories).text} ${
              getCategoryColor(currentCategory, categories).hover
            }`}
          >
            {currentCategory}
          </button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
          >
            + Add
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-2">
          {/* Existing categories */}
          {sortedCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
              {sortedCategories.map((category) => {
                const colors = getCategoryColor(category, categories);
                return (
                  <button
                    key={category}
                    onClick={() => handleSelect(category)}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${colors.bg} ${colors.text} ${colors.hover}`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          )}

          {/* Separator */}
          {sortedCategories.length > 0 && (
            <div className="border-t border-border my-2" />
          )}

          {/* New category input */}
          <div className="flex gap-1.5">
            <Input
              ref={inputRef}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="New category..."
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              variant="secondary"
              className="h-8 px-2"
              onClick={handleAddNew}
              disabled={!newCategory.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
