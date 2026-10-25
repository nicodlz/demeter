import { describe, expect, it } from "vitest";
import { expenseDedupKey, normalizeDescription } from "./expenseDedup";

describe("expense duplicate keys", () => {
  it("normalizes case, whitespace and quotes", () => {
    expect(normalizeDescription('  Café "Central"  ')).toBe("café central");
  });

  it("uses the absolute amount", () => {
    const positive = expenseDedupKey({
      date: "2025-09-02",
      description: "Shop",
      amount: 12.5,
      sourceProvider: "deblock",
    });
    const negative = expenseDedupKey({
      date: "2025-09-02",
      description: "Shop",
      amount: -12.5,
      sourceProvider: "deblock",
    });
    expect(positive).toBe(negative);
  });

  it("distinguishes the same transaction on different providers", () => {
    const deblock = expenseDedupKey({
      date: "2025-09-02",
      description: "Shop",
      amount: 12.5,
      sourceProvider: "deblock",
    });
    const bourso = expenseDedupKey({
      date: "2025-09-02",
      description: "Shop",
      amount: 12.5,
      sourceProvider: "bourso",
    });
    expect(deblock).not.toBe(bourso);
  });
});
