"use client";

import { useApp } from "@/lib/store";
import { CURRENCIES, CURRENCY_INFO } from "@/lib/currency";
import { cn } from "@/lib/utils";

/** The buyer picks the currency he pays (cash) or installs (installment) in. Saved in this browser. */
export function CurrencySwitch({ className }: { className?: string }) {
  const { payCurrency, setPayCurrency } = useApp();
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-sm font-medium">عملة الدفع والتقسيط</p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="عملة الدفع">
        {CURRENCIES.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={payCurrency === c}
            onClick={() => setPayCurrency(c)}
            className={cn(
              "rounded-lg border px-2 py-2 text-sm transition-colors",
              payCurrency === c ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
            )}
          >
            {CURRENCY_INFO[c].label}
          </button>
        ))}
      </div>
    </div>
  );
}
