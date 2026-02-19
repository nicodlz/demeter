import { useCallback } from 'react';
import { useStore } from '../store';
import type { SavedItem } from '../schemas';

export function useSavedItems() {
  const savedItems = useStore((state) => state.savedItems);
  const addSavedItem = useStore((state) => state.addSavedItem);
  const saveFromLineItem = useStore((state) => state.saveFromLineItem);
  const incrementUsage = useStore((state) => state.incrementUsage);
  const updateSavedItem = useStore((state) => state.updateSavedItem);
  const deleteSavedItem = useStore((state) => state.deleteSavedItem);

  const getSavedItemById = useCallback(
    (id: string): SavedItem | undefined =>
      savedItems.find((item) => item.id === id),
    [savedItems]
  );

  const searchSavedItems = useCallback(
    (query: string): SavedItem[] => {
      const trimmed = query.trim().toLowerCase();
      if (!trimmed) return savedItems;
      return savedItems.filter((item) =>
        item.description.toLowerCase().includes(trimmed)
      );
    },
    [savedItems]
  );

  const getMostUsedItems = useCallback(
    (limit?: number): SavedItem[] => {
      const sorted = [...savedItems].sort(
        (a, b) => b.usageCount - a.usageCount
      );
      return limit ? sorted.slice(0, limit) : sorted;
    },
    [savedItems]
  );

  return {
    savedItems,
    addSavedItem,
    saveFromLineItem,
    incrementUsage,
    updateSavedItem,
    deleteSavedItem,
    getSavedItemById,
    searchSavedItems,
    getMostUsedItems,
  };
}
