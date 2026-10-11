import { describe, expect, it } from "vitest";
import { computeCommission } from "./commission";

describe("commission", () => {
  it("5% of 100,000", () => expect(computeCommission(100000, 5)).toEqual({ commission: 5000, merchantNet: 95000 }));
  it("bounds 1 and 10 are accepted", () => {
    expect(computeCommission(1000, 1).commission).toBe(10);
    expect(computeCommission(1000, 10).commission).toBe(100);
  });
  it("rejects 0, 11 and fractions", () => {
    for (const r of [0, 11, 2.5, -1]) expect(() => computeCommission(1000, r)).toThrow();
  });
  it("commission + net always equals the amount", () => {
    const { commission, merchantNet } = computeCommission(12345, 7);
    expect(commission + merchantNet).toBe(12345);
  });
});
