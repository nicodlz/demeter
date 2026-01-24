import type { Invoice, LineItem } from '../types';

/**
 * Calculate subtotal (sum of all line items before VAT)
 */
export function calculateSubtotal(lineItems: LineItem[]): number {
  return lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
}

/**
 * Calculate VAT amount based on line items
 */
export function calculateVAT(lineItems: LineItem[], applyVAT: boolean): number {
  if (!applyVAT) return 0;
  return lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (item.vatRate / 100),
    0
  );
}

/**
 * Calculate total (subtotal + VAT)
 */
export function calculateTotal(lineItems: LineItem[], applyVAT: boolean): number {
  return calculateSubtotal(lineItems) + calculateVAT(lineItems, applyVAT);
}

/**
 * Calculate total for a complete invoice
 */
export function calculateInvoiceTotal(invoice: Invoice): number {
  return calculateTotal(invoice.lineItems, invoice.applyVAT);
}

/**
 * Calculate split ratio safely (handles division by zero)
 */
export function calculateSplitRatio(splitAmount: number, total: number): number {
  return total > 0 ? splitAmount / total : 0;
}

/**
 * Calculate split percentage safely (handles division by zero)
 */
export function calculateSplitPercentage(splitAmount: number, total: number): number {
  return total > 0 ? (splitAmount / total) * 100 : 0;
}
