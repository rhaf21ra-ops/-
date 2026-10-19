"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { REQUEST_MONTHS, requestsAreDemo, submitRequest, validateRequest, type NewRequestInput } from "@/lib/product-requests";
import { toast } from "sonner";
import { PackagePlus, ImagePlus, Loader2, Send, CheckCircle, Trash2, Link2, Store } from "lucide-react";

const EMPTY: NewRequestInput = {
  productName: "", productUrl: "", storeName: "", storeCity: "", storePhone: "",
  estimatedPrice: "", quantity: 1, months: null, notes: "", image: null,
};

export default function RequestProductPage() {
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState<NewRequestInput>(EMPTY);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof NewRequestInput>(k: K, v: NewRequestInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  function pick(file: File | undefined) {
    if (!file) return;
    const probe = validateRequest({ ...form, productName: "xx", image: file });
    if (probe && /الصور|حجم/.test(probe)) { setError(probe); return; }
    setError("");
    set("image", file);
    setPreview(URL.createObjectURL(file));
  }
  function dropImage() {
    set("image", null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!user) return;
    const bad = validateRequest(form);
    if (bad) { setError(bad); return; }
    setBusy(true);
    const res = await submitRequest({ id: user.id, fullName: user.fullName, phone: user.phone }, form);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    toast.success("تم إرسال طلبك");
    setDone(res.requestNumber ?? "");
    setForm(EMPTY); dropImage();
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-10">{children}</div>
      <Footer />
    </div>
  );

  if (done !== null) {
    return shell(
      <div className="max-w-md mx-auto text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"><CheckCircle className="h-8 w-8 text-green-600" /></div>
        <h1 className="text-2xl font-bold mb-2">وصلنا طلبك</h1>
        <p className="text-muted-foreground mb-2">رقم الطلب</p>
        <p className="text-xl font-bold text-primary mb-5" dir="ltr">{done}</p>
        <p className="text-sm text-muted-foreground mb-6">
          ستتواصل إدارة قسطها مع المتجر وتنسق الشراء، ثم نرسل لك عرض التقسيط هنا وفي الإشعارات.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/requests"><Button className="w-full">متابعة طلباتي</Button></Link>
          <Button variant="outline" onClick={() => setDone(null)}>طلب منتج آخر</Button>
        </div>
      </div>
    );
  }

  return shell(
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><PackagePlus className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-bold">طلب منتج غير مدرج</h1>
          <p className="text-sm text-muted-foreground">لم تجد ما تريد في قسطها؟ أرسل لنا رابط المنتج أو صورته من أي متجر محلي، ونحن نتواصل مع المتجر ونوفره لك بالتقسيط.</p>
        </div>
      </div>

      <ol className="my-5 grid gap-2 sm:grid-cols-3 text-sm">
        {["أرسل الرابط أو الصورة", "نتواصل مع المتجر ونؤكد السعر والتوفر", "يصلك عرض التقسيط وتوافق عليه"].map((t, i) => (
          <li key={i} className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{i + 1}</span>{t}
          </li>
        ))}
      </ol>

      {requestsAreDemo && (
        <Alert className="mb-4"><AlertDescription>وضع تجريبي: الطلبات تُحفظ في هذا المتصفح فقط حتى تُربط قاعدة البيانات.</AlertDescription></Alert>
      )}

      {!authLoading && !user ? (
        <Card><CardContent className="p-6 text-center space-y-3">
          <p>سجّل الدخول (كعميل أو موظف) لإرسال طلب منتج.</p>
          <div className="flex gap-2 justify-center">
            <Link href="/login?redirect=/request-product"><Button>تسجيل الدخول</Button></Link>
            <Link href="/register"><Button variant="outline">إنشاء حساب</Button></Link>
          </div>
        </CardContent></Card>
      ) : (
        <Card className="shadow-lg"><CardContent className="p-6">
          {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label className="mb-1.5 block">اسم المنتج *</Label>
              <Input value={form.productName} onChange={(e) => set("productName", e.target.value)} placeholder="مثال: ثلاجة سامسونج 450 لتر" maxLength={200} required />
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <p className="text-sm font-medium">أرسل رابطًا أو صورة (واحدًا على الأقل) *</p>
              <div>
                <Label className="mb-1.5 flex items-center gap-1.5"><Link2 className="h-4 w-4" />رابط المنتج</Label>
                <Input dir="ltr" value={form.productUrl} onChange={(e) => set("productUrl", e.target.value)} placeholder="https://..." inputMode="url" />
              </div>
              <div>
                <Label className="mb-1.5 flex items-center gap-1.5"><ImagePlus className="h-4 w-4" />صورة المنتج</Label>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
                {preview ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="معاينة" className="h-24 w-24 rounded-lg border object-cover" />
                    <Button type="button" variant="outline" size="sm" onClick={dropImage}><Trash2 className="h-4 w-4 ml-1" />إزالة</Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}><ImagePlus className="h-4 w-4 ml-2" />اختر صورة من الجهاز</Button>
                )}
                <p className="mt-1 text-xs text-muted-foreground">JPG أو PNG أو WebP، حتى 5 ميجابايت. يمكنك أخذ لقطة شاشة لإعلان المتجر.</p>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <p className="flex items-center gap-1.5 text-sm font-medium"><Store className="h-4 w-4" />عن المتجر (إن عرفته، يسرّع التنسيق)</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label className="mb-1.5 block">اسم المتجر</Label><Input value={form.storeName} onChange={(e) => set("storeName", e.target.value)} /></div>
                <div><Label className="mb-1.5 block">المدينة / المنطقة</Label><Input value={form.storeCity} onChange={(e) => set("storeCity", e.target.value)} /></div>
              </div>
              <div><Label className="mb-1.5 block">هاتف المتجر</Label><Input dir="ltr" value={form.storePhone} onChange={(e) => set("storePhone", e.target.value)} placeholder="7XXXXXXXX" /></div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div><Label className="mb-1.5 block">السعر التقريبي (ر.ي)</Label><Input type="number" min={1} inputMode="decimal" value={form.estimatedPrice} onChange={(e) => set("estimatedPrice", e.target.value)} /></div>
              <div><Label className="mb-1.5 block">الكمية</Label><Input type="number" min={1} max={100} value={form.quantity} onChange={(e) => set("quantity", Math.min(100, Math.max(1, Number(e.target.value) || 1)))} /></div>
              <div>
                <Label className="mb-1.5 block">مدة التقسيط المفضلة</Label>
                <Select value={form.months ? String(form.months) : "none"} onValueChange={(v) => set("months", v === "none" ? null : Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">لم أحدد</SelectItem>
                    {REQUEST_MONTHS.map((m) => <SelectItem key={m} value={String(m)}>{m} شهرًا</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div><Label className="mb-1.5 block">ملاحظات (اللون، المقاس، الموديل...)</Label><Textarea rows={3} maxLength={2000} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>

            <p className="text-xs text-muted-foreground">الإرسال لا يلزمك بالشراء. السعر النهائي وعرض التقسيط يصلانك بعد تأكيد المتجر، وتقرر أنت بعدها.</p>
            <Button type="submit" size="lg" className="w-full" disabled={busy || authLoading}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-5 w-5 ml-2" />إرسال الطلب</>}
            </Button>
            {user && <div className="text-center"><Link href="/requests" className="text-sm text-primary hover:underline">طلباتي السابقة</Link></div>}
          </form>
        </CardContent></Card>
      )}
    </div>
  );
}
