"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/store";

/** Real mode: an employee account picks the company it works for. The company then sets eligibility and the limit. */
export function JoinCompany() {
  const { companies, joinCompany } = useApp();
  const active = companies.filter((c) => c.status === "نشط");
  const [companyId, setCompanyId] = useState("");
  const [job, setJob] = useState("");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return toast.error("اختر شركتك");
    setBusy(true);
    const r = await joinCompany(companyId, job, number);
    setBusy(false);
    if (r.ok) toast.success("تم ربط حسابك بالشركة. بانتظار تحديد أهليتك وسقفك من الشركة");
    else toast.error(r.error);
  }

  return (
    <Card className="mb-6 border-primary/30">
      <CardContent className="p-5">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><Building2 className="h-5 w-5 text-primary" /> اربط حسابك بشركتك</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          لن تستطيع طلب التقسيط بخصم الراتب قبل اختيار شركتك وموافقتها على أهليتك. إن لم تجد شركتك فهي لم تُفعَّل بعد من الإدارة.
        </p>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="mb-1.5 block">الشركة *</Label>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">اختر الشركة</option>
              {active.map((c) => <option key={c.id} value={c.id}>{c.name}{c.city ? ` - ${c.city}` : ""}</option>)}
            </select>
          </div>
          <div><Label className="mb-1.5 block">الوظيفة</Label><Input value={job} onChange={(e) => setJob(e.target.value)} /></div>
          <div><Label className="mb-1.5 block">رقمك الوظيفي</Label><Input value={number} onChange={(e) => setNumber(e.target.value)} /></div>
          <div className="sm:col-span-3"><Button type="submit" disabled={busy || active.length === 0}>{busy ? "جارٍ الحفظ..." : "ربط الحساب"}</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}
