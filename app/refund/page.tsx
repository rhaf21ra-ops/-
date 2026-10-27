"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">سياسة الإرجاع والاستبدال</h1>
        <Card>
          <CardContent className="p-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">1. مدة الإرجاع</h2>
              <p>يمكن للمستخدم طلب إرجاع أو استبدال المنتج خلال 7 أيام من تاريخ الاستلام. يجب أن يكون المنتج في حالته الأصلية مع جميع ملحقاته وتغليفه.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">2. شروط الإرجاع</h2>
              <ul className="list-disc pr-5 space-y-1">
                <li>المنتج في حالته الأصلية ولم يُستخدم</li>
                <li>جميع الملحقات والتغليف الأصلي موجود</li>
                <li>إثبات الشراء (رقم الطلب)</li>
                <li>المنتج ليس من المنتجات غير القابلة للإرجاع (مثل العطور المفتوحة، المنتجات الغذائية المفتوحة)</li>
              </ul>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">3. طريقة الإرجاع</h2>
              <p>لطلب الإرجاع، تواصل مع خدمة العملاء مع رقم الطلب وسبب الإرجاع. سيتم تنسيق عملية استلام المنتج عبر شركة التوصيل. بعد فحص المنتج يتم اعتماد الاستبدال أو استرجاع المبلغ.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">4. استرجاع المبلغ</h2>
              <p>في حال الموافقة على الإرجاع، يتم استرجاع المبلغ بنفس طريقة الدفع الأصلية. للطلبات النقدية يتم الاسترجاع نقداً. لطلبات التقسيط يتم تعديل العقد وفقاً للحالة.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">5. منتجات لا تُقبل الإرجاع</h2>
              <ul className="list-disc pr-5 space-y-1">
                <li>المنتجات الغذائية المفتوحة</li>
                <li>العطور ومستحضرات التجميل المفتوحة</li>
                <li>المنتجات المخصصة شخصياً</li>
                <li>المنتجات التالفة بسبب سوء الاستخدام</li>
              </ul>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">6. الاستبدال</h2>
              <p>يمكن استبدال المنتج بمنتج آخر من نفس المتجر بنفس القيمة أو بقيمة أعلى مع دفع الفرق. إذا كان المنتج البديل أقل قيمة، يتم استرجاع الفرق.</p>
            </section>
            <p className="text-xs text-muted-foreground pt-4 border-t">آخر تحديث: سبتمبر 2026</p>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
