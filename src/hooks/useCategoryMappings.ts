import { useCallback } from 'react';
import { useStore } from '../store';

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
  const mappings = useStore((state) => state.mappings);
  const setMerchantCategory = useStore((state) => state.setMerchantCategory);
  const deleteMapping = useStore((state) => state.deleteMapping);
  const deleteMappingForMerchant = useStore((state) => state.deleteMappingForMerchant);

  // Get category for a merchant (returns undefined if no mapping)
  const getCategoryForMerchant = useCallback(
    (merchantName: string): string | undefined => {
      const normalized = normalizeMerchant(merchantName);
      const mapping = mappings.find((m) => m.normalizedMerchant === normalized);
      return mapping?.category;
    },
    [mappings]
  );

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
