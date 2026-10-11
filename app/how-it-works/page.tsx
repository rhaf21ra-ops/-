"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Search, CreditCard, ClipboardList, CheckCircle2, Truck, Wallet } from "lucide-react";

const steps = [
  { icon: Search, title: "1. اختر المنتج", desc: "تصفح المتاجر اليمنية واختر ما يناسبك من بين آلاف المنتجات المتنوعة." },
  { icon: CreditCard, title: "2. اختر طريقة الدفع", desc: "ادفع نقداً أو اختر خطة تقسيط مرنة تناسب راتبك (6، 9، 12، 18، أو 24 شهراً)." },
  { icon: ClipboardList, title: "3. قدم الطلب", desc: "إذا اخترت التقسيط، يتم تقديم طلبك للمراجعة من قبل إدارة المنصة." },
  { icon: CheckCircle2, title: "4. مراجعة الطلب", desc: "تتم مراجعة طلبك والموافقة عليه من قبل الإدارة، ويتم إشعارك بالنتيجة." },
  { icon: Truck, title: "5. استلام المنتج", desc: "يتم تجهيز طلبك من قبل التاجر وتوصيله إلى عنوانك في أي محافظة يمنية." },
  { icon: Wallet, title: "6. تابع الأقساط", desc: "تابع خطط السداد الخاصة بك من حسابك، واعرف مواعيد الأقساط والمبالغ المتبقية." },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3">كيف تعمل المنصة؟</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">من اختيار المنتج إلى متابعة الأقساط، إليك الخطوات البسيطة للتسوق في قسطها.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                  <step.icon className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
