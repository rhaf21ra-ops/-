import { formatMoney, type Currency } from "@/lib/currency";
export const BRAND = {
  name: "قسطها",
  tagline: "تسوّق من متاجر اليمن، وادفع على راحتك",
  currency: "YER",
  currencySymbol: "ر.ي",
  locale: "ar",
  dir: "rtl" as const,
};

export const INSTALLMENT_DURATIONS = [6, 9, 12, 18, 24];

export function formatCurrency(amount: number, currency: Currency = "YER"): string {
  return formatMoney(amount, currency);
}

export function calculateDeferredPrice(cashPrice: number): number {
  return Math.round(cashPrice * 1.22);
}

export function calculateMonthlyInstallment(deferredPrice: number, months: number): number {
  return Math.round(deferredPrice / months);
}
