// Three currencies: Yemeni rial (YER), Saudi riyal (SAR), US dollar (USD).
// A product keeps the currency its merchant typed. A buyer pays or installs in the currency he picks.
// The server (SQL: _fx_convert / _round_money) is the authority; the functions here only mirror it for display.
export type Currency = "YER" | "SAR" | "USD";
export const CURRENCIES: Currency[] = ["YER", "SAR", "USD"];

export const CURRENCY_INFO: Record<Currency, { label: string; short: string; symbol: string; decimals: number }> = {
  YER: { label: "ريال يمني", short: "ر.ي", symbol: "ر.ي", decimals: 0 },
  SAR: { label: "ريال سعودي", short: "ر.س", symbol: "ر.س", decimals: 2 },
  USD: { label: "دولار أمريكي", short: "$", symbol: "$", decimals: 2 },
};

/** YER per ONE unit of the currency. Placeholders: the owner sets the real SAR and USD rates in the admin settings. */
export type Rates = Record<Currency, number>;
export const DEFAULT_RATES: Rates = { YER: 1, SAR: 140, USD: 530 };

export const isCurrency = (v: unknown): v is Currency => v === "YER" || v === "SAR" || v === "USD";
export const asCurrency = (v: unknown): Currency => (isCurrency(v) ? v : "YER");

export function roundMoney(amount: number, c: Currency): number {
  const f = c === "YER" ? 1 : 100;
  return Math.round((amount + Number.EPSILON) * f) / f;
}

export function convertMoney(amount: number, from: Currency, to: Currency, rates: Rates): number {
  if (from === to) return amount;
  return (amount * rates[from]) / rates[to];
}

/** Converts, then rounds in the target currency (what the server does for each unit price). */
export function convertRounded(amount: number, from: Currency, to: Currency, rates: Rates): number {
  return roundMoney(convertMoney(amount, from, to, rates), to);
}

export function formatMoney(amount: number, currency: Currency = "YER"): string {
  const d = CURRENCY_INFO[currency].decimals;
  const n = new Intl.NumberFormat("ar-YE", { minimumFractionDigits: d, maximumFractionDigits: d }).format(
    d === 0 ? Math.round(amount) : roundMoney(amount, currency),
  );
  return currency === "USD" ? `${n} $` : `${n} ${CURRENCY_INFO[currency].short}`;
}

/** Same as formatMoney with plain Latin digits, for PDFs and QR pages. */
export function formatMoneyLatin(amount: number, currency: Currency = "YER"): string {
  const d = CURRENCY_INFO[currency].decimals;
  const n = new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).format(
    d === 0 ? Math.round(amount) : roundMoney(amount, currency),
  );
  return `${n} ${currency === "USD" ? "$" : CURRENCY_INFO[currency].short}`;
}
