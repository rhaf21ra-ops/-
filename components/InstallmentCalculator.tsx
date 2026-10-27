"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateInstallment } from "@/lib/installmentCalculator";
import { formatCurrency } from "@/lib/brand";

export function InstallmentCalculator(){
  const [price,setPrice]=useState(100000);
  const [down,setDown]=useState(20000);
  const [months,setMonths]=useState(12);
  const [rate,setRate]=useState(15);
  const r=calculateInstallment({price,down,months,profitRate:rate});
  return (
    <Card className="border-emerald-200">
      <CardHeader><CardTitle className="text-base">حاسبة التقسيط الاحترافية</CardTitle><p className="text-xs text-muted-foreground">النسب قابلة للتعديل من لوحة التحكم</p></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>سعر المنتج</Label><Input type="number" value={price} onChange={e=>setPrice(+e.target.value)}/></div>
          <div><Label>الدفعة الأولى</Label><Input type="number" value={down} onChange={e=>setDown(+e.target.value)}/></div>
          <div><Label>المدة</Label><Select value={String(months)} onValueChange={v=>setMonths(+v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{[3,6,9,12,18,24].map(m=><SelectItem key={m} value={String(m)}>{m} أشهر</SelectItem>)}</SelectContent></Select></div>
          <div><Label>نسبة الربح %</Label><Input type="number" value={rate} onChange={e=>setRate(+e.target.value)}/></div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm bg-emerald-50 p-3 rounded-lg">
          <div>المتبقي: <b>{formatCurrency(r.remaining)}</b></div><div>الربح: <b>{formatCurrency(r.profit)}</b></div>
          <div>القسط الشهري: <b className="text-emerald-700">{formatCurrency(r.monthly)}</b></div><div>الإجمالي: <b>{formatCurrency(r.total)}</b></div>
        </div>
        <div className="max-h-48 overflow-auto text-xs"><table className="w-full"><thead><tr><th>قسط</th><th>تاريخ</th><th>مبلغ</th></tr></thead><tbody>{r.schedule.map(s=><tr key={s.n}><td>{s.n}</td><td>{s.due.toLocaleDateString('ar-YE')}</td><td>{formatCurrency(s.amount)}</td></tr>)}</tbody></table></div>
      </CardContent>
    </Card>
  );
}
