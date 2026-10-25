import { describe, expect, it } from "vitest";
import {
  calculateCompoundInterest,
  calculateWeightedReturn,
  yearsToReachTarget,
} from "./projections";

describe("projections", () => {
  it("compounds contributions and keeps contributed capital separate", () => {
    const result = calculateCompoundInterest(10_000, 1_000, 0.07, 10);
    expect(result.projectionByYear).toHaveLength(10);
    expect(result.totalContributed).toBe(10_000 + 1_000 * 12 * 10);
    expect(result.finalValue).toBeGreaterThan(result.totalContributed);
    expect(result.totalGains).toBeCloseTo(
      result.finalValue - result.totalContributed,
      2,
    );
  });

  it("returns the principal when there is no growth or contribution", () => {
    const result = calculateCompoundInterest(5_000, 0, 0, 1);
    expect(result.finalValue).toBe(5_000);
    expect(result.totalGains).toBe(0);
  });

  it("finds the years needed to reach a target", () => {
    expect(yearsToReachTarget(10_000, 0, 0.07, 20_000)).toBe(10);
    expect(yearsToReachTarget(10_000, 0, 0.07, 100, 5)).toBe(0);
    expect(yearsToReachTarget(0, 0, 0, 100, 5)).toBeNull();
  });

  it("computes a weighted return and handles an empty allocation", () => {
    expect(
      calculateWeightedReturn(
        { stocks: 50, crypto: 50, cash: 0, stablecoins: 0 },
        { stocks: 0.1, crypto: 0.2 },
      ),
    ).toBeCloseTo(0.15);
    expect(
      calculateWeightedReturn({
        stocks: 0,
        crypto: 0,
        cash: 0,
        stablecoins: 0,
      }),
    ).toBe(0);
  });
});
