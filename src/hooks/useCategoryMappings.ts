import { useState, useEffect, useCallback } from 'react';
import type { CategoryMapping } from '../types';
import { categoryMappingSchema } from '../schemas';
import { storage, STORAGE_KEYS } from '../utils/storage';

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

export const useCategoryMappings = () => {
  const [mappings, setMappings] = useState<CategoryMapping[]>(() =>
    storage.get<CategoryMapping[]>(STORAGE_KEYS.CATEGORY_MAPPINGS, [])
  );

  // Sync to localStorage
  useEffect(() => {
    storage.set(STORAGE_KEYS.CATEGORY_MAPPINGS, mappings);
  }, [mappings]);

  // Get category for a merchant (returns undefined if no mapping)
  const getCategoryForMerchant = useCallback(
    (merchantName: string): string | undefined => {
      const normalized = normalizeMerchant(merchantName);
      const mapping = mappings.find((m) => m.normalizedMerchant === normalized);
      return mapping?.category;
    },
    [mappings]
  );

  // Add or update a mapping
  const setMerchantCategory = (merchantName: string, category: string) => {
    const normalized = normalizeMerchant(merchantName);

    setMappings((prev) => {
      const existingIndex = prev.findIndex((m) => m.normalizedMerchant === normalized);

      if (existingIndex >= 0) {
        // Update existing
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          category,
        };
        return updated;
      }

      // Create new
      const newMapping = {
        id: crypto.randomUUID(),
        normalizedMerchant: normalized,
        category,
        createdAt: new Date().toISOString(),
      };
      const result = categoryMappingSchema.safeParse(newMapping);
      if (!result.success) {
        console.error('[Demeter] Invalid category mapping:', result.error.issues);
        return prev;
      }
      return [...prev, result.data];
    });
  };

  // Delete a mapping
  const deleteMapping = (id: string) => {
    setMappings((prev) => prev.filter((m) => m.id !== id));
  };

  // Delete mapping by merchant name
  const deleteMappingForMerchant = (merchantName: string) => {
    const normalized = normalizeMerchant(merchantName);
    setMappings((prev) => prev.filter((m) => m.normalizedMerchant !== normalized));
  };

  // Get all unique categories from mappings
  const getUniqueCategories = useCallback(() => {
    return [...new Set(mappings.map((m) => m.category))].sort();
  }, [mappings]);

  // Get all mappings sorted by category
  const getSortedMappings = useCallback(() => {
    return [...mappings].sort((a, b) => a.category.localeCompare(b.category));
  }, [mappings]);

  // Function to use during import - auto-categorize based on existing mappings
  const createCategoryMapper = useCallback((): ((merchantName: string) => string | undefined) => {
    return (merchantName: string) => getCategoryForMerchant(merchantName);
  }, [getCategoryForMerchant]);

  return {
    mappings,
    getCategoryForMerchant,
    setMerchantCategory,
    deleteMapping,
    deleteMappingForMerchant,
    getUniqueCategories,
    getSortedMappings,
    createCategoryMapper,
  };
};
