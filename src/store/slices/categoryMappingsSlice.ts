import type { StateCreator } from 'zustand';
import type { CategoryMapping } from '../../schemas';
import type { StoreState, CategoryMappingsSlice } from '../types';

/**
 * Normalize merchant name for consistent matching
 */
const normalizeMerchant = (merchant: string): string => {
  return merchant
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/['"]/g, '')
    .trim();
};

export const createCategoryMappingsSlice: StateCreator<
  StoreState,
  [],
  [],
  CategoryMappingsSlice
> = (set) => ({
  mappings: [],

  setMerchantCategory: (merchantName, category) => {
    const normalized = normalizeMerchant(merchantName);
    set((state) => {
      const existingIndex = state.mappings.findIndex(
        (m) => m.normalizedMerchant === normalized
      );

      if (existingIndex >= 0) {
        const updated = [...state.mappings];
        updated[existingIndex] = {
          ...updated[existingIndex],
          category,
        };
        return { mappings: updated };
      }

      const newMapping: CategoryMapping = {
        id: crypto.randomUUID(),
        normalizedMerchant: normalized,
        category,
        createdAt: new Date().toISOString(),
      };
      return { mappings: [...state.mappings, newMapping] };
    });
  },

  deleteMapping: (id) => {
    set((state) => ({
      mappings: state.mappings.filter((m) => m.id !== id),
    }));
  },

  deleteMappingForMerchant: (merchantName) => {
    const normalized = normalizeMerchant(merchantName);
    set((state) => ({
      mappings: state.mappings.filter(
        (m) => m.normalizedMerchant !== normalized
      ),
    }));
  },
});
