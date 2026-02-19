import type { SavedItem } from '@/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';

interface SavedItemAutocompleteProps {
  lineItemId: string;
  description: string;
  isActive: boolean;
  filteredItems: SavedItem[];
  savedItemsCount: number;
  currencySymbol: string;
  autocompleteRef: React.RefObject<HTMLDivElement> | null;
  onDescriptionChange: (lineItemId: string, value: string) => void;
  onFocus: (lineItemId: string) => void;
  onApply: (lineItemId: string, savedItem: SavedItem) => void;
  onDelete: (savedItemId: string) => void;
}

export const SavedItemAutocomplete = ({
  lineItemId,
  description,
  isActive,
  filteredItems,
  savedItemsCount,
  currencySymbol,
  autocompleteRef,
  onDescriptionChange,
  onFocus,
  onApply,
  onDelete,
}: SavedItemAutocompleteProps) => {
  return (
    <div ref={autocompleteRef}>
      <Label className="text-xs">Description *</Label>
      <div className="relative mt-1">
        <Input
          required
          value={description}
          onChange={(e) => onDescriptionChange(lineItemId, e.target.value)}
          onFocus={() => onFocus(lineItemId)}
          placeholder="Start typing..."
        />
        {isActive && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
            <div className="px-3 py-1.5 text-xs text-muted-foreground bg-muted border-b">
              Saved items {savedItemsCount > 0 && `(${savedItemsCount})`}
            </div>
            {filteredItems.length > 0 ? (
              filteredItems.map((savedItem) => (
                <div key={savedItem.id} className="flex items-center border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onApply(lineItemId, savedItem)}
                    className="flex-1 px-3 py-2 text-left hover:bg-accent"
                  >
                    <div className="text-sm font-medium">{savedItem.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {currencySymbol}
                      {savedItem.unitPrice.toFixed(2)} / {savedItem.unit}
                    </div>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(savedItem.id);
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                {savedItemsCount === 0
                  ? 'No saved items yet.'
                  : 'No matching items found.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
