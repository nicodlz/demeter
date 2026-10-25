import { describe, expect, it } from "vitest";
import {
  calculateSplitPercentage,
  calculateSplitRatio,
  calculateSubtotal,
  calculateTotal,
  calculateVAT,
} from "./invoiceCalculations";
import type { LineItem } from "@/schemas";

const lineItems: LineItem[] = [
  {
    id: "1",
    description: "Development",
    quantity: 2,
    unit: "day",
    unitPrice: 500,
    vatRate: 20,
    type: "service",
  },
  {
    id: "2",
    description: "Hosting",
    quantity: 1,
    unit: "month",
    unitPrice: 100,
    vatRate: 10,
    type: "expense",
  },
];

describe("invoice calculations", () => {
  it("computes subtotal, VAT and total per line", () => {
    expect(calculateSubtotal(lineItems)).toBe(1100);
    expect(calculateVAT(lineItems, true)).toBe(210);
    expect(calculateTotal(lineItems, true)).toBe(1310);
  });

  it("ignores VAT when disabled", () => {
    expect(calculateVAT(lineItems, false)).toBe(0);
    expect(calculateTotal(lineItems, false)).toBe(1100);
  });

  it("handles an empty invoice", () => {
    expect(calculateSubtotal([])).toBe(0);
    expect(calculateTotal([], true)).toBe(0);
  });

  it("handles split ratios safely", () => {
    expect(calculateSplitRatio(500, 1000)).toBe(0.5);
    expect(calculateSplitRatio(500, 0)).toBe(0);
    expect(calculateSplitPercentage(250, 1000)).toBe(25);
    expect(calculateSplitPercentage(250, 0)).toBe(0);
  });
});
