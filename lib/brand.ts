export const BRAND = {
  name: "قسطها",
  tagline: "تسوّق من متاجر اليمن، وادفع على راحتك",
  currency: "YER",
  currencySymbol: "ر.ي",
  locale: "ar",
  dir: "rtl" as const,
};

export const INSTALLMENT_DURATIONS = [6, 9, 12, 18, 24];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-YE", { maximumFractionDigits: 0 }).format(
    Math.round(amount)
  ) + " ر.ي";
}

export function calculateDeferredPrice(cashPrice: number): number {
  return Math.round(cashPrice * 1.22);
}

export function calculateMonthlyInstallment(deferredPrice: number, months: number): number {
  return Math.round(deferredPrice / months);
}
