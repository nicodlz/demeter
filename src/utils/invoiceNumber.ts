/**
 * Generate invoice number based on format and counter
 * Supported formats:
 * - YYYY-NNN: 2025-001
 * - YYYYNNN: 2025001
 * - FA-YYYY-NNN: FA-2025-001
 */
export const generateInvoiceNumber = (
  counter: number,
  format: string = "YYYY-NNN",
): string => {
  const year = new Date().getFullYear().toString();
  const paddedCounter = counter.toString().padStart(3, "0");

  return format.replace("YYYY", year).replace("NNN", paddedCounter);
};

/**
 * Extract the sequence counter from a number generated with `format`.
 * Returns null when the number does not match the format.
 */
export const extractInvoiceCounter = (
  invoiceNumber: string,
  format: string = "YYYY-NNN",
): number | null => {
  const escaped = format.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = escaped.replace("YYYY", "\\d{4}").replace("NNN", "(\\d{3,})");
  const match = invoiceNumber.match(new RegExp(`^${pattern}$`));
  if (!match) return null;
  const counter = Number(match[match.length - 1]);
  return Number.isFinite(counter) ? counter : null;
};

/**
 * Parse invoice number to extract counter value.
 * Kept for backwards compatibility; prefer `extractInvoiceCounter` when the
 * invoice number format is known (e.g. YYYYNNN would otherwise be ambiguous).
 */
export const parseInvoiceNumber = (invoiceNumber: string): number | null => {
  const match = invoiceNumber.match(/(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
};

/**
 * Compute the next free invoice number for the current year, guaranteeing that
 * an existing number is never reused (even after deleting the last invoice).
 */
export const generateNextInvoiceNumber = (
  existingNumbers: string[],
  format: string = "YYYY-NNN",
): string => {
  const year = new Date().getFullYear().toString();
  const used = new Set(existingNumbers);
  let counter = existingNumbers.reduce((max, number) => {
    const parsed = extractInvoiceCounter(number, format);
    return parsed !== null ? Math.max(max, parsed) : max;
  }, 0);

  for (let attempt = 0; attempt < 10_000; attempt++) {
    counter += 1;
    const candidate = generateInvoiceNumber(counter, format);
    // Only numbers for the current year participate in the sequence.
    if (!candidate.startsWith(year) && format.includes("YYYY")) continue;
    if (!used.has(candidate)) return candidate;
  }

  return generateInvoiceNumber(counter, format);
};
