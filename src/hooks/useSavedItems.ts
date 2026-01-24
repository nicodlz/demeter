import { useState, useEffect, useCallback } from 'react';
import type { SavedItem, LineItem } from '../types';
import { storage, STORAGE_KEYS } from '../utils/storage';

export function useSavedItems() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() =>
    storage.get<SavedItem[]>(STORAGE_KEYS.SAVED_ITEMS, [])
  );

  useEffect(() => {
    storage.set(STORAGE_KEYS.SAVED_ITEMS, savedItems);
  }, [savedItems]);

  const findByDescription = useCallback(
    (description: string): SavedItem | undefined =>
      savedItems.find(
        (s) => s.description.toLowerCase() === description.toLowerCase()
      ),
    [savedItems]
  );

  const updateItemById = useCallback(
    (id: string, updater: (item: SavedItem) => SavedItem): void => {
      setSavedItems((prev) =>
        prev.map((item) => (item.id === id ? updater(item) : item))
      );
    },
    []
  );

  function addSavedItem(
    item: Omit<SavedItem, 'id' | 'createdAt' | 'usageCount'>
  ): SavedItem {
    const existing = findByDescription(item.description);

    if (existing) {
      updateItemById(existing.id, (s) => ({
        ...s,
        ...item,
        usageCount: s.usageCount + 1,
      }));
      return { ...existing, ...item, usageCount: existing.usageCount + 1 };
    }

    const newItem: SavedItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      usageCount: 1,
    };
    setSavedItems((prev) => [...prev, newItem]);
    return newItem;
  }

  function saveFromLineItem(lineItem: LineItem): SavedItem {
    return addSavedItem({
      description: lineItem.description,
      unit: lineItem.unit,
      unitPrice: lineItem.unitPrice,
      type: lineItem.type,
      defaultQuantity: lineItem.quantity,
    });
  }

  function incrementUsage(id: string): void {
    updateItemById(id, (item) => ({
      ...item,
      usageCount: item.usageCount + 1,
    }));
  }

  function updateSavedItem(id: string, data: Partial<SavedItem>): void {
    updateItemById(id, (item) => ({ ...item, ...data }));
  }

  function deleteSavedItem(id: string): void {
    setSavedItems((prev) => prev.filter((item) => item.id !== id));
  }

  function getSavedItemById(id: string): SavedItem | undefined {
    return savedItems.find((item) => item.id === id);
  }

  function searchSavedItems(query: string): SavedItem[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return savedItems;
    return savedItems.filter((item) =>
      item.description.toLowerCase().includes(trimmed)
    );
  }

  function getMostUsedItems(limit?: number): SavedItem[] {
    const sorted = [...savedItems].sort((a, b) => b.usageCount - a.usageCount);
    return limit ? sorted.slice(0, limit) : sorted;
  }

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
