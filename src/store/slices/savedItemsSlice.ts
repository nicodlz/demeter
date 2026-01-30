import type { StateCreator } from 'zustand';
import type { SavedItem } from '../../types';
import type { StoreState, SavedItemsSlice } from '../types';

export const createSavedItemsSlice: StateCreator<
  StoreState,
  [],
  [],
  SavedItemsSlice
> = (set, get) => ({
  savedItems: [],

  addSavedItem: (item) => {
    const { savedItems } = get();
    const existing = savedItems.find(
      (s) => s.description.toLowerCase() === item.description.toLowerCase()
    );

    if (existing) {
      const updated: SavedItem = {
        ...existing,
        ...item,
        usageCount: existing.usageCount + 1,
      };
      set((state) => ({
        savedItems: state.savedItems.map((s) =>
          s.id === existing.id ? updated : s
        ),
      }));
      return updated;
    }

    const newItem: SavedItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      usageCount: 1,
    };
    set((state) => ({ savedItems: [...state.savedItems, newItem] }));
    return newItem;
  },

  saveFromLineItem: (lineItem) => {
    return get().addSavedItem({
      description: lineItem.description,
      unit: lineItem.unit,
      unitPrice: lineItem.unitPrice,
      type: lineItem.type,
      defaultQuantity: lineItem.quantity,
    });
  },

  incrementUsage: (id) => {
    set((state) => ({
      savedItems: state.savedItems.map((item) =>
        item.id === id
          ? { ...item, usageCount: item.usageCount + 1 }
          : item
      ),
    }));
  },

  updateSavedItem: (id, data) => {
    set((state) => ({
      savedItems: state.savedItems.map((item) =>
        item.id === id ? { ...item, ...data } : item
      ),
    }));
  },

  deleteSavedItem: (id) => {
    set((state) => ({
      savedItems: state.savedItems.filter((item) => item.id !== id),
    }));
  },
});
