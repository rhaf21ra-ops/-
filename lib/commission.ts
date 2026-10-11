/** Platform commission on merchant sales: an integer from 1 to 10 (%). */
export const MIN_COMMISSION = 1;
export const MAX_COMMISSION = 10;

export function assertCommissionRate(rate: number): void {
  if (!Number.isInteger(rate) || rate < MIN_COMMISSION || rate > MAX_COMMISSION) {
    throw new Error("Commission must be a whole number from 1 to 10");
  }
}

/** Mirrors SQL compute_commission(): round(amount × rate / 100). */
export function computeCommission(amount: number, rate: number): { commission: number; merchantNet: number } {
  assertCommissionRate(rate);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Invalid amount");
  const commission = Math.round((amount * rate) / 100);
  return { commission, merchantNet: amount - commission };
}
