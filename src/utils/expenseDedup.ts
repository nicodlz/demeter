/**
 * Normalize a merchant/description for duplicate detection and matching.
 */
export const normalizeDescription = (description: string): string =>
  description.toLowerCase().replace(/\s+/g, " ").replace(/['"]/g, "").trim();

interface ExpenseKeyInput {
  date: string;
  description: string;
  merchantName?: string;
  amount: number;
  sourceProvider?: string;
}

/**
 * Stable duplicate key shared by the import preview and the store.
 * The provider is part of the key: the same amount at the same merchant on the
 * same day on two different bank accounts is not a duplicate.
 */
export const expenseDedupKey = (input: ExpenseKeyInput): string =>
  [
    input.date,
    normalizeDescription(input.merchantName || input.description),
    Math.abs(input.amount),
    input.sourceProvider ?? "",
  ].join("|");
