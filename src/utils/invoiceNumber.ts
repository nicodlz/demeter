/**
 * Generate invoice number based on format and counter
 * Supported formats:
 * - YYYY-NNN: 2025-001
 * - YYYYNNN: 2025001
 * - FA-YYYY-NNN: FA-2025-001
 */
export const generateInvoiceNumber = (
  counter: number,
  format: string = 'YYYY-NNN'
): string => {
  const year = new Date().getFullYear().toString();
  const paddedCounter = counter.toString().padStart(3, '0');

  return format
    .replace('YYYY', year)
    .replace('NNN', paddedCounter);
};

/**
 * Parse invoice number to extract counter value
 */
export const parseInvoiceNumber = (invoiceNumber: string): number | null => {
  // Extract the last sequence of digits
  const match = invoiceNumber.match(/(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
};
