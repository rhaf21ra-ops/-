"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceDocument, verifyUrl, type ScheduleRow } from "@/components/invoice/InvoiceDocument";
import { usePdfDownload } from "@/components/invoice/useDownload";
import { useApp } from "@/lib/store";
import { CURRENCIES, CURRENCY_INFO, formatMoney } from "@/lib/currency";
import type { Invoice } from "@/lib/types";
import { toast } from "sonner";
import { FileText, Download, Eye, Search, Loader2, QrCode, FileSpreadsheet, Copy } from "lucide-react";

const KIND_LABEL: Record<Invoice["kind"], string> = { sale: "نقدي", installment_sale: "تقسيط" };

export default function InvoicesPage() {
  const { currentUser, invoices, merchants, installmentContracts, rates, isReal } = useApp();
  const [q, setQ] = useState("");
  const [cur, setCur] = useState("all");
  const [open, setOpen] = useState<Invoice | null>(null);
  const [scale, setScale] = useState(1);
  const pdf = usePdfDownload();

  // Real mode: the database already returns only what this person may see. Demo mode filters here.
  const mine = useMemo(() => {
    if (isReal || !currentUser) return invoices;
    if (currentUser.role === "admin") return invoices;
    if (currentUser.role === "merchant") {
      const m = merchants.find((x) => x.userId === currentUser.id);
      return invoices.filter((v) => v.merchantId === m?.id);
    }
    return invoices.filter((v) => v.buyerId === currentUser.id);
  }, [invoices, isReal, currentUser, merchants]);

  const list = mine.filter((v) => {
    if (cur !== "all" && v.currency !== cur) return false;
    const s = q.trim().toLowerCase();
    return !s || [v.invoiceNumber, v.orderNumber, v.buyerName, v.merchantName].some((x) => x?.toLowerCase().includes(s));
  });

  function scheduleFor(v: Invoice): ScheduleRow[] | undefined {
    if (v.kind !== "installment_sale") return undefined;
    const c = installmentContracts.find((x) => x.id === v.contractId);
    if (c) return c.payments.map((p) => ({ number: p.number, dueDate: p.dueDate, amount: p.amount, status: p.status }));
    if (!v.months || !v.deferredTotal) return undefined;
    const per = v.monthly ?? 0;
    return Array.from({ length: v.months }, (_, i) => ({
      number: i + 1,
      dueDate: new Date(new Date(v.issuedAt).getTime() + 30 * (i + 1) * 86400000).toISOString(),
      amount: i === v.months! - 1 ? (v.deferredTotal as number) - per * (v.months! - 1) : per,
      status: "قادم",
    }));
  }

  function show(v: Invoice) {
    setScale(Math.min(1, (Math.min(window.innerWidth, 900) - 56) / 794));
    setOpen(v);
  }

  async function downloadNow(v: Invoice) {
    setOpen(v);          // the hidden copy below renders this invoice, then we capture it
    await new Promise((r) => setTimeout(r, 150));
    const ok = await pdf.download(v.invoiceNumber);
    if (ok) toast.success("تم تنزيل الفاتورة PDF"); else toast.error("تعذر إنشاء ملف PDF");
  }

  async function copyLink(v: Invoice) {
    try { await navigator.clipboard.writeText(verifyUrl(v.verifyCode)); toast.success("تم نسخ رابط التحقق"); }
    catch { toast.error("تعذر النسخ"); }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold">الفواتير</h1>
              <p className="text-sm text-muted-foreground">حمّل أي فاتورة PDF، وفيها رمز QR يتحقق به أي شخص من صحتها.</p>
            </div>
          </div>
          {currentUser && currentUser.role !== "merchant" && (
            <Link href="/invoices/statement"><Button variant="outline"><FileSpreadsheet className="ml-2 h-4 w-4" />كشف حساب التقسيط</Button></Link>
          )}
        </div>

        {!currentUser ? (
          <Card><CardContent className="space-y-3 p-8 text-center">
            <p>سجّل الدخول لعرض فواتيرك.</p>
            <Link href="/login?redirect=/invoices"><Button>تسجيل الدخول</Button></Link>
          </CardContent></Card>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pr-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث برقم الفاتورة أو الطلب أو الاسم" />
              </div>
              <Select value={cur} onValueChange={setCur}>
                <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل العملات</SelectItem>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{CURRENCY_INFO[c].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {list.length === 0 ? (
              <Card><CardContent className="p-10 text-center text-muted-foreground">
                لا توجد فواتير بعد. تُصدر الفاتورة تلقائياً عند إتمام طلب نقدي، وعند الموافقة على عقد التقسيط.
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {list.map((v) => (
                  <Card key={v.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold" dir="ltr">{v.invoiceNumber}</span>
                        <Badge variant="secondary">{KIND_LABEL[v.kind]}</Badge>
                        {v.status === "void" && <Badge variant="destructive">ملغاة</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {currentUser.role === "merchant" ? v.buyerName : v.merchantName} · طلب <span dir="ltr">{v.orderNumber}</span> · {new Date(v.issuedAt).toLocaleDateString("ar-YE")}
                      </p>
                    </div>
                    <div className="text-left sm:text-center">
                      <p className="font-bold text-primary">{formatMoney(v.kind === "installment_sale" && v.deferredTotal ? v.deferredTotal : v.total, v.currency)}</p>
                      {v.kind === "installment_sale" && <p className="text-xs text-muted-foreground">نقدي {formatMoney(v.total, v.currency)}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => show(v)}><Eye className="ml-1 h-4 w-4" />عرض</Button>
                      <Button size="sm" onClick={() => downloadNow(v)} disabled={pdf.busy}>
                        {pdf.busy && open?.id === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="ml-1 h-4 w-4" />PDF</>}
                      </Button>
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />

      {/* hidden, untransformed copy that is captured into the PDF */}
      {open && (
        <div style={{ position: "fixed", left: -10000, top: 0 }} aria-hidden>
          <InvoiceDocument ref={pdf.ref} invoice={open} schedule={scheduleFor(open)} rates={rates} />
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => { if (!o) setOpen(null); }}>
        <DialogContent className="max-h-[92vh] max-w-[900px] overflow-y-auto">
          <DialogHeader><DialogTitle>{open?.invoiceNumber}</DialogTitle></DialogHeader>
          {open && (
            <>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={async () => { const ok = await pdf.download(open.invoiceNumber); ok ? toast.success("تم تنزيل الفاتورة PDF") : toast.error("تعذر إنشاء ملف PDF"); }} disabled={pdf.busy}>
                  {pdf.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="ml-1 h-4 w-4" />تنزيل PDF</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => copyLink(open)}><Copy className="ml-1 h-4 w-4" />نسخ رابط التحقق</Button>
                <Link href={`/verify/${open.verifyCode}`} target="_blank"><Button size="sm" variant="outline"><QrCode className="ml-1 h-4 w-4" />صفحة التحقق</Button></Link>
              </div>
              <div style={{ height: 1123 * scale, overflow: "hidden" }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: "top right", width: 794 }}>
                  <InvoiceDocument invoice={open} schedule={scheduleFor(open)} rates={rates} />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
