"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { CURRENCY_INFO, type Currency } from "@/lib/currency";

/** Owner only. Rates are YER per ONE unit. They apply to NEW orders; existing orders keep the rate they were priced with. */
export function ExchangeRatesCard() {
  const { rates, setRate, currentUser } = useApp();
  const [vals, setVals] = useState<Record<"SAR" | "USD", string>>({ SAR: String(rates.SAR), USD: String(rates.USD) });
  const [busy, setBusy] = useState<Currency | null>(null);
  useEffect(() => { setVals({ SAR: String(rates.SAR), USD: String(rates.USD) }); }, [rates.SAR, rates.USD]);

  const owner = currentUser?.role === "admin";
  async function save(code: "SAR" | "USD") {
    setBusy(code);
    await setRate(code, Number(vals[code]));
    setBusy(null);
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">أسعار الصرف (مقابل الريال اليمني)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {(["SAR", "USD"] as const).map((c) => (
          <div key={c}>
            <Label className="mb-1.5 block">كم ريالاً يمنياً يساوي 1 {CURRENCY_INFO[c].label}؟</Label>
            <div className="flex gap-2">
              <Input type="number" min="0" step="0.01" dir="ltr" value={vals[c]} onChange={(e) => setVals({ ...vals, [c]: e.target.value })} disabled={!owner} />
              <Button onClick={() => save(c)} disabled={!owner || busy === c}>{busy === c ? "..." : "حفظ"}</Button>
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          يحوّل النظام أسعار المنتجات بين العملات الثلاث بهذه الأسعار عند إنشاء الطلب، ويحفظ سعر الصرف المستخدم مع كل طلب فلا يتغير بعده.
          الأسعار الأولية تقديرية: عدّلها إلى سعر السوق عندك قبل الإطلاق.
        </p>
        {!owner && <p className="text-xs text-destructive">تعديل الأسعار لمالك المنصة فقط.</p>}
      </CardContent>
    </Card>
  );
}
