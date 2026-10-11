import { describe, expect, it } from "vitest";
import { availableLimit, deferredPrice, installmentSchedule, monthlyInstallment } from "./installments";

describe("installments", () => {
  it("applies the default flat 22%", () => expect(deferredPrice(100000)).toBe(122000));
  it("supports a per-customer markup", () => {
    expect(deferredPrice(100000, 10)).toBe(110000);
    expect(deferredPrice(100000, 0)).toBe(100000);
  });
  it("monthly = round(deferred / months)", () => expect(monthlyInstallment(100000, 12)).toBe(10167));
  it("last installment absorbs the difference", () => {
    const s = installmentSchedule(100000, 12);
    expect(s).toHaveLength(12);
    expect(s[0]).toBe(10167);
    expect(s[11]).toBe(10163);
    expect(s.reduce((a, b) => a + b, 0)).toBe(122000);
  });
  it("sum is always exact for every duration and markup", () => {
    for (const m of [6, 9, 12, 18, 24] as const)
      for (const p of [0, 10, 22, 35.5])
        expect(installmentSchedule(285000, m, p).reduce((a, b) => a + b, 0)).toBe(deferredPrice(285000, p));
  });
  it("matches the live site's iPhone price", () => expect(deferredPrice(285000)).toBe(347700));
  it("rejects invalid markup", () => {
    expect(() => deferredPrice(1000, -1)).toThrow();
    expect(() => deferredPrice(1000, 101)).toThrow();
  });
  it("available limit", () => {
    expect(availableLimit(100, 30)).toBe(70);
    expect(availableLimit(100, 130)).toBe(0);
  });
  it("rejects invalid duration", () => {
    // @ts-expect-error invalid on purpose
    expect(() => monthlyInstallment(1000, 7)).toThrow();
  });
});
