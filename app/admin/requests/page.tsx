"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequestImage } from "@/components/RequestImage";
import {
  REQUEST_STATUS_COLOR, REQUEST_STATUS_LABEL, listAllRequests, requestsAreDemo, staffUpdateRequest,
  type ProductRequest, type RequestStatus,
} from "@/lib/product-requests";
import { toast } from "sonner";
import { Loader2, Search, ArrowRight, ExternalLink, Phone, Inbox } from "lucide-react";

const STATUSES = Object.keys(REQUEST_STATUS_LABEL) as RequestStatus[];
const money = (n: number) => `${n.toLocaleString("en-US")} ر.ي`;

export default function AdminRequestsPage() {
  const [items, setItems] = useState<ProductRequest[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<ProductRequest | null>(null);
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await listAllRequests();
    setItems(r.data);
    setError(r.error ? "تعذر تحميل الطلبات" : "");
    setSel((cur) => (cur ? r.data.find((x) => x.id === cur.id) ?? null : null));
  }, []);
  useEffect(() => { load(); }, [load]);

  function open(r: ProductRequest) {
    setSel(r); setNote(r.adminNote); setQuote(r.quotedPrice ? String(r.quotedPrice) : "");
    setStoreName(r.storeName); setStorePhone(r.storePhone);
  }

  async function save(status?: RequestStatus) {
    if (!sel) return;
    const price = quote.trim() ? Number(quote) : null;
    if (price !== null && !(price > 0)) { toast.error("السعر المؤكد غير صحيح"); return; }
    if (status === "offer_sent" && price === null) { toast.error("أدخل السعر المؤكد من المتجر قبل إرسال العرض"); return; }
    setBusy(true);
    const err = await staffUpdateRequest(sel.id, { status, adminNote: note.trim(), quotedPrice: price, storeName: storeName.trim(), storePhone: storePhone.trim() });
    setBusy(false);
    if (err) { toast.error(err); return; }
    toast.success(status ? "تم تحديث الحالة وإبلاغ العميل" : "تم الحفظ");
    load();
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (items ?? []).forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [items]);

  const list = (items ?? []).filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    const s = q.trim().toLowerCase();
    return !s || [r.requestNumber, r.productName, r.fullName, r.storeName, r.phone].some((v) => v?.toLowerCase().includes(s));
  });

  return (
    <DashboardLayout navItems={adminNavItems} title="طلبات المنتجات غير المدرجة" role="admin">
      {!sel ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-bold">طلبات المنتجات غير المدرجة</h1>
            {(counts.new ?? 0) > 0 && <Badge className="bg-red-100 text-red-800">{counts.new} طلب جديد</Badge>}
          </div>
          {requestsAreDemo && <p className="mb-3 rounded-md bg-amber-50 p-2 text-xs text-amber-800">وضع تجريبي: الطلبات من هذا المتصفح فقط.</p>}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pr-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث برقم الطلب أو المنتج أو العميل أو المتجر" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{REQUEST_STATUS_LABEL[s]} ({counts[s] ?? 0})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
          {items === null ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : list.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center gap-2 p-10 text-muted-foreground"><Inbox className="h-8 w-8" />لا توجد طلبات</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {list.map((r) => (
                <Card key={r.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => open(r)}>
                  <CardContent className="flex gap-3 p-4">
                    <RequestImage request={r} className="h-16 w-16" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{r.productName}</span>
                        <Badge variant="secondary" className={REQUEST_STATUS_COLOR[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{r.fullName || "—"} · {r.storeName || "متجر غير محدد"}{r.storeCity ? ` (${r.storeCity})` : ""}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr" style={{ textAlign: "right" }}>{r.requestNumber} · {new Date(r.createdAt).toLocaleString("ar-YE")}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="max-w-3xl space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setSel(null)}><ArrowRight className="ml-1 h-4 w-4" />رجوع للقائمة</Button>
          <Card><CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{sel.productName}</h1>
              <Badge variant="secondary" className={REQUEST_STATUS_COLOR[sel.status]}>{REQUEST_STATUS_LABEL[sel.status]}</Badge>
              <span className="text-xs text-muted-foreground" dir="ltr">{sel.requestNumber}</span>
            </div>
            <div className="flex gap-4">
              <RequestImage request={sel} className="h-40 w-40" />
              <div className="space-y-1 text-sm">
                <p>العميل: <b>{sel.fullName || "—"}</b></p>
                {sel.phone && <p className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /><a href={`tel:${sel.phone}`} dir="ltr" className="text-primary">{sel.phone}</a></p>}
                <p>الكمية: {sel.quantity}{sel.months ? ` · التقسيط المفضل ${sel.months} شهرًا` : ""}</p>
                {sel.estimatedPrice && <p>السعر التقريبي عند العميل: {money(sel.estimatedPrice)}</p>}
                {sel.productUrl && (
                  <a href={sel.productUrl} target="_blank" rel="noreferrer noopener" dir="ltr" className="inline-flex items-center gap-1 break-all text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />{sel.productUrl}
                  </a>
                )}
                {sel.notes && <p className="rounded bg-muted p-2">{sel.notes}</p>}
              </div>
            </div>
          </CardContent></Card>

          <Card><CardContent className="space-y-4 p-5">
            <h2 className="font-bold">التنسيق مع المتجر</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label className="mb-1 block">اسم المتجر</Label><Input value={storeName} onChange={(e) => setStoreName(e.target.value)} /></div>
              <div><Label className="mb-1 block">هاتف المتجر</Label><Input dir="ltr" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} /></div>
              <div><Label className="mb-1 block">السعر المؤكد من المتجر (ر.ي)</Label><Input type="number" min={1} value={quote} onChange={(e) => setQuote(e.target.value)} /></div>
              {sel.storeCity && <div className="text-sm text-muted-foreground self-end pb-2">المدينة: {sel.storeCity}</div>}
            </div>
            <div><Label className="mb-1 block">ملاحظة تظهر للعميل</Label><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: المتجر أكد التوفر ويحتاج عربونًا..." /></div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" disabled={busy} onClick={() => save()}>حفظ بدون تغيير الحالة</Button>
              <Select value="" onValueChange={(v) => save(v as RequestStatus)} disabled={busy}>
                <SelectTrigger className="w-56"><SelectValue placeholder="نقل إلى حالة..." /></SelectTrigger>
                <SelectContent>
                  {STATUSES.filter((s) => s !== sel.status).map((s) => <SelectItem key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <p className="text-xs text-muted-foreground">عند تغيير الحالة يصل العميل إشعار تلقائي. إنشاء عقد التقسيط يتم بعد شراء المنتج من صفحة التقسيط.</p>
          </CardContent></Card>
        </div>
      )}
    </DashboardLayout>
  );
}
