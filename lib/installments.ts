export const INSTALLMENT_MONTHS = [6, 9, 12, 18, 24] as const;
export type InstallmentMonths = (typeof INSTALLMENT_MONTHS)[number];

/** Platform default markup. Each customer/employee may have a custom value set by the owner. */
export const DEFAULT_MARKUP_PERCENT = 22;

function checkMarkup(p: number) {
  if (!Number.isFinite(p) || p < 0 || p > 100) throw new Error("Invalid markup percentage");
}

/** deferred = round(cash × (1 + markup/100)). Flat percentage, never compound. */
export function deferredPrice(cashPrice: number, markupPercent: number = DEFAULT_MARKUP_PERCENT): number {
  if (!Number.isFinite(cashPrice) || cashPrice < 0) throw new Error("Invalid cash price");
  checkMarkup(markupPercent);
  return Math.round(cashPrice * (1 + markupPercent / 100));
}

/** Monthly installment as in the original spec: round(deferred / months). */
export function monthlyInstallment(
  cashPrice: number, months: InstallmentMonths, markupPercent: number = DEFAULT_MARKUP_PERCENT,
): number {
  if (!INSTALLMENT_MONTHS.includes(months)) throw new Error("Invalid installment duration");
  return Math.round(deferredPrice(cashPrice, markupPercent) / months);
}

/** Every installment is the rounded monthly value; the LAST absorbs the difference so the sum is exact. */
export function installmentSchedule(
  cashPrice: number, months: InstallmentMonths, markupPercent: number = DEFAULT_MARKUP_PERCENT,
): number[] {
  const total = deferredPrice(cashPrice, markupPercent);
  const per = monthlyInstallment(cashPrice, months, markupPercent);
  const schedule = Array<number>(months).fill(per);
  schedule[months - 1] = total - per * (months - 1);
  return schedule;
}

/** Available limit = installment_limit - used_limit */
export const availableLimit = (limit: number, used: number) => Math.max(0, limit - used);

export const formatYER = (n: number) =>
  new Intl.NumberFormat("ar-YE", { style: "currency", currency: "YER", maximumFractionDigits: 0 }).format(n);
