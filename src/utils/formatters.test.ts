import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
} from "./formatters";

describe("formatters", () => {
  it("never renders NaN or Infinity", () => {
    expect(formatCurrency(Number.NaN, "EUR")).not.toContain("NaN");
    expect(formatCurrency(Number.POSITIVE_INFINITY, "USD")).not.toContain(
      "Infinity",
    );
  });

  it("puts the minus sign before the currency symbol in compact mode", () => {
    expect(formatCurrencyCompact(-1500, "USD")).toBe("-$1.5k");
    expect(formatCurrencyCompact(1500, "EUR")).toBe("€1.5k");
  });

  it("does not shift a date-only value across timezones", () => {
    expect(formatDate("2025-09-02", "en-CA")).toBe("2025-09-02");
  });
});
