"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase-client";
import { useApp } from "@/lib/store";
import { asCurrency, CURRENCY_INFO, formatMoney } from "@/lib/currency";
import { BRAND } from "@/lib/brand";
import { ShieldCheck, ShieldX, Loader2 } from "lucide-react";

type Result = {
  valid: boolean; status?: string; invoice_number?: string; issued_at?: string; kind?: string; currency?: string;
  total?: number; deferred_total?: number | null; months?: number | null; merchant_name?: string | null; buyer_masked?: string | null;
};

/** Public page behind the QR code on every invoice. Shows only what proves the invoice is genuine. */
export default function VerifyInvoicePage() {
  const params = useParams<{ code: string }>();
  const code = String(params?.code ?? "");
  const { invoices } = useApp();
  const [res, setRes] = useState<Result | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.rpc("verify_invoice", { p_code: code });
        if (alive) setRes(error ? { valid: false } : (data as Result));
      } else {
        // demo mode: invoices live in this browser only
        const v = invoices.find((x) => x.verifyCode.toUpperCase() === code.toUpperCase());
        if (!alive) return;
        setRes(v ? {
          valid: v.status === "issued", status: v.status, invoice_number: v.invoiceNumber, issued_at: v.issuedAt, kind: v.kind, currency: v.currency,
          total: v.total, deferred_total: v.deferredTotal ?? null, months: v.months ?? null, merchant_name: v.merchantName,
          buyer_masked: v.buyerName ? v.buyerName.slice(0, 1) + "*".repeat(Math.max(v.buyerName.length - 1, 2)) : null,
        } : { valid: false });
      }
    })();
    return () => { alive = false; };
  }, [code, invoices]);

  const cur = asCurrency(res?.currency);
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-md px-4 py-12">
        {res === null ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
        ) : res.valid ? (
          <Card className="border-green-300"><CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100"><ShieldCheck className="h-9 w-9 text-green-600" /></div>
            <h1 className="text-2xl font-bold text-green-700">فاتورة أصلية</h1>
            <p className="text-sm text-muted-foreground">صادرة من منصة {BRAND.name} وما زالت سارية.</p>
            <dl className="space-y-2 rounded-lg bg-muted/40 p-4 text-right text-sm">
              <Row k="رقم الفاتورة" v={<span dir="ltr">{res.invoice_number}</span>} />
              <Row k="التاريخ" v={res.issued_at ? new Date(res.issued_at).toLocaleDateString("en-GB") : "—"} />
              <Row k="النوع" v={res.kind === "installment_sale" ? "بيع بالتقسيط" : "بيع نقدي"} />
              <Row k="المبلغ" v={<b>{formatMoney(res.total ?? 0, cur)}</b>} />
              {res.deferred_total ? <Row k={`إجمالي التقسيط (${res.months} شهراً)`} v={formatMoney(res.deferred_total, cur)} /> : null}
              <Row k="العملة" v={CURRENCY_INFO[cur].label} />
              <Row k="التاجر" v={res.merchant_name || "—"} />
              <Row k="العميل" v={<span dir="ltr">{res.buyer_masked || "—"}</span>} />
            </dl>
            <p className="text-xs text-muted-foreground">طابِق هذه البيانات مع الفاتورة التي بين يديك. إن اختلفت فالفاتورة غير صحيحة.</p>
          </CardContent></Card>
        ) : (
          <Card className="border-red-300"><CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100"><ShieldX className="h-9 w-9 text-red-600" /></div>
            <h1 className="text-2xl font-bold text-red-700">{res.status === "void" ? "فاتورة ملغاة" : "لم نجد هذه الفاتورة"}</h1>
            <p className="text-sm text-muted-foreground">
              {res.status === "void" ? `هذه الفاتورة (${res.invoice_number}) أُلغيت ولا يُعتدّ بها.` : "الرمز غير مسجّل لدينا. قد تكون الفاتورة مزوّرة أو الرمز غير مكتمل."}
            </p>
            <Link href="/"><Button variant="outline">الصفحة الرئيسية</Button></Link>
          </CardContent></Card>
        )}
      </div>
      <Footer />
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>;
}
