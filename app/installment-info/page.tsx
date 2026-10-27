"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, calculateMonthlyInstallment } from "@/lib/brand";
import { CreditCard, Calculator, Wallet, Calendar, Info } from "lucide-react";
import { INSTALLMENT_DURATIONS } from "@/lib/brand";
import { useState } from "react";

export default function InstallmentInfoPage() {
  const [price, setPrice] = useState(100000);
  const [duration, setDuration] = useState(12);
  const deferred = Math.round(price * 1.22);
  const monthly = calculateMonthlyInstallment(deferred, duration);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3">برنامج التقسيط</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">ادفع على راحتك عبر خطط تقسيط مرنة تناسب راتبك الشهري.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Calculator */}
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <h2 className="font-bold text-xl mb-4 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                حاسبة التقسيط
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">سعر المنتج (ر.ي)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                    className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">مدة التقسيط</label>
                  <div className="flex flex-wrap gap-2">
                    {INSTALLMENT_DURATIONS.map(d => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          duration === d ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
                        }`}
                      >
                        {d} شهراً
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">السعر النقدي</p>
                    <p className="font-bold text-sm">{formatCurrency(price)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">السعر المؤجل</p>
                    <p className="font-bold text-sm text-primary">{formatCurrency(deferred)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">القسط الشهري</p>
                    <p className="font-bold text-sm text-primary">{formatCurrency(monthly)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold text-xl mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  كيف يعمل التقسيط؟
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2"><span className="text-primary font-bold">1.</span> اختر منتجاً متاحاً للتقسيط من المتجر.</p>
                  <p className="flex items-start gap-2"><span className="text-primary font-bold">2.</span> اختر خطة التقسيط ومدة السداد المناسبة.</p>
                  <p className="flex items-start gap-2"><span className="text-primary font-bold">3.</span> يتم تقديم طلبك للمراجعة من قبل الإدارة.</p>
                  <p className="flex items-start gap-2"><span className="text-primary font-bold">4.</span> بعد الموافقة، يتم تفعيل عقد التقسيط.</p>
                  <p className="flex items-start gap-2"><span className="text-primary font-bold">5.</span> تابع الأقساط وسدد في مواعيد الاستحقاق.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <h2 className="font-bold mb-3 flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  ملاحظة قانونية مهمة
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  التقسيط في المنصة بيع آجل بين التاجر والعميل بسعر مؤجل يُعرض بوضوح قبل التأكيد، وتخضع الخدمة للأنظمة والقوانين المعمول بها في الجمهورية اليمنية.
                  لا يتم اتخاذ أي قرار تمويلي بشكل تلقائي، بل يخضع لمراجعة بشرية وتقييم الأهلية وفقاً للمعايير المعتمدة.
                </p>
                <div className="mt-4 pt-4 border-t border-primary/10 space-y-2">
                  <p className="text-xs font-medium">النقاط الأساسية:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 mr-5 list-disc">
                    <li>التحقق من الهوية خطوة منفصلة عن تقييم الأهلية المالية.</li>
                    <li>صور الهوية والسيلفي بيانات حساسة تُعالج وفق سياسة الخصوصية.</li>
                    <li>الموافقة على طلب التقسيط تخضع لمراجعة بشرية وليست تلقائية.</li>
                    <li>نسبة السعر المؤجل (22%) وقيمة القسط قد تتغير بقرار الإدارة، وتُعرض بوضوح قبل التأكيد.</li>
                    <li>هذه المنصة لا تقدم استشارة مالية أو عرضاً ملزماً.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
