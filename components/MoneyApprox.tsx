"use client";

import { useApp } from "@/lib/store";
import { CURRENCIES, asCurrency, convertRounded, formatMoney, type Currency } from "@/lib/currency";

/** "≈ 357.14 ر.س · 100 $": the same price in the two other currencies, at the platform's current rates. */
export function MoneyApprox({ amount, currency, className }: { amount: number; currency?: Currency; className?: string }) {
  const { rates } = useApp();
  const from = asCurrency(currency);
  const others = CURRENCIES.filter((c) => c !== from);
  return (
    <span className={className ?? "text-[11px] text-muted-foreground"} dir="rtl">
      ≈ {others.map((c) => formatMoney(convertRounded(amount, from, c, rates), c)).join(" · ")}
    </span>
  );
}
