"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RequestImage } from "@/components/RequestImage";
import { useAuth } from "@/lib/auth-context";
import {
  OPEN_STATUSES, REQUEST_STATUS_COLOR, REQUEST_STATUS_LABEL, cancelMyRequest, listMyRequests, type ProductRequest,
} from "@/lib/product-requests";
import { toast } from "sonner";
import { Loader2, PackagePlus, ExternalLink } from "lucide-react";

const money = (n: number) => `${n.toLocaleString("en-US")} ر.ي`;

export default function MyRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<ProductRequest[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const r = await listMyRequests(user.id);
    setItems(r.data);
    setError(r.error ? "تعذر تحميل الطلبات" : "");
  }, [user]);
  useEffect(() => { load(); }, [load]);

  async function cancel(id: string) {
    if (!confirm("إلغاء هذا الطلب؟")) return;
    const err = await cancelMyRequest(id);
    if (err) toast.error(err); else { toast.success("تم إلغاء الطلب"); load(); }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">طلباتي لمنتجات غير مدرجة</h1>
          <Link href="/request-product"><Button size="sm"><PackagePlus className="h-4 w-4 ml-1" />طلب جديد</Button></Link>
        </div>

        {!authLoading && !user ? (
          <Card><CardContent className="p-6 text-center">
            <p className="mb-3">سجّل الدخول لعرض طلباتك.</p>
            <Link href="/login?redirect=/requests"><Button>تسجيل الدخول</Button></Link>
          </CardContent></Card>
        ) : items === null ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {items.length === 0 && (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد طلبات بعد.</CardContent></Card>
            )}
            {items.map((r) => (
              <Card key={r.id}><CardContent className="p-4 space-y-3">
                <div className="flex gap-3">
                  <RequestImage request={r} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold">{r.productName}</h2>
                      <Badge className={REQUEST_STATUS_COLOR[r.status]} variant="secondary">{REQUEST_STATUS_LABEL[r.status]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground" dir="ltr" style={{ textAlign: "right" }}>{r.requestNumber} · {new Date(r.createdAt).toLocaleDateString("ar-YE")}</p>
                    <p className="text-sm text-muted-foreground">
                      {[r.storeName, r.storeCity].filter(Boolean).join(" - ") || "متجر غير محدد"} · الكمية {r.quantity}
                      {r.months ? ` · ${r.months} شهرًا` : ""}{r.estimatedPrice ? ` · تقريبًا ${money(r.estimatedPrice)}` : ""}
                    </p>
                    {r.productUrl && (
                      <a href={r.productUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs text-primary hover:underline" dir="ltr">
                        <ExternalLink className="h-3 w-3" />رابط المنتج
                      </a>
                    )}
                  </div>
                </div>
                {(r.quotedPrice || r.adminNote) && (
                  <div className="rounded-lg bg-primary/5 p-3 text-sm space-y-1">
                    {r.quotedPrice && <p>السعر المؤكد من المتجر: <b>{money(r.quotedPrice)}</b>. سيحدد فريقنا قسط التقسيط عند التواصل معك.</p>}
                    {r.adminNote && <p>ملاحظة الإدارة: {r.adminNote}</p>}
                  </div>
                )}
                {OPEN_STATUSES.includes(r.status) && (
                  <Button variant="outline" size="sm" onClick={() => cancel(r.id)}>إلغاء الطلب</Button>
                )}
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
