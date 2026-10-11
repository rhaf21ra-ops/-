"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">الشروط والأحكام</h1>
        <Card>
          <CardContent className="p-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">1. مقدمة</h2>
              <p>مرحباً بك في منصة "قسطها". باستخدامك لهذه المنصة فإنك توافق على الشروط والأحكام التالية. هذه المنصة هي منصة تجريبية (Demo) مخصصة لعرض نموذج تطبيقي ولا تقدم خدمات مالية فعلية.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">2. استخدام المنصة</h2>
              <p>يحق للمستخدمين المسجلين تصفح المنتجات وإضافة المنتجات إلى السلة وإرسال الطلبات. يجب أن تكون جميع المعلومات المقدمة صحيحة ودقيقة. يُمنع استخدام المنصة لأي أغراض غير قانونية أو مخالفة للقوانين اليمنية.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">3. الحسابات والأدوار</h2>
              <p>تنقسم حسابات المنصة إلى أربعة أدوار: موظف، تاجر، شركة، ومدير. كل دور له صلاحيات محددة. يجب على المستخدم الالتزام بصلاحيات دوره وعدم محاولة الوصول إلى بيانات أو وظائف غير مخول لها.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">4. المنتجات والطلبات</h2>
              <p>التجار مسؤولون عن دقة معلومات منتجاتهم وأسعارها ومخزونها. الإدارة تحتفظ بالحق في مراجعة وحذف أي منتجات غير ملائمة. جميع الطلبات تخضع لمراجعة قبل التأكيد.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">5. التقسيط</h2>
              <p>برنامج التقسيط المعروض هو نموذج تجريبي توضيحي فقط. خدمات التقسيط والدفع الفعلية تخضع مستقبلاً للجهات المرخصة والعقود والتنظيمات المعمول بها في الجمهورية اليمنية. لا تعتبر الأرقام المعروضة عرضاً مالياً ملزماً.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">6. المسؤولية</h2>
              <p>تسعى المنصة لتوفير تجربة تسوق آمنة وموثوقة، لكنها لا تضمن خلو المنصة من الأخطاء. المنصة غير مسؤولة عن أي أضرار غير مباشرة قد تنتج عن استخدامها. هذه نسخة تجريبية وقد تتوقف أو تتغير في أي وقت.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">7. الخصوصية</h2>
              <p>نحترم خصوصية مستخدمينا. يُرجى مراجعة سياسة الخصوصية لفهم كيفية تعاملنا مع بياناتك. لا تُستخدم في هذه النسخة التجريبية بيانات حقيقية لأشخاص أو جهات فعلية.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">8. تعديل الشروط</h2>
              <p>يحق للإدارة تعديل هذه الشروط في أي وقت. استمرارك في استخدام المنصة بعد التعديل يعني موافقتك على الشروط المعدلة.</p>
            </section>
            <p className="text-xs text-muted-foreground pt-4 border-t">آخر تحديث: سبتمبر 2026 - هذه شروط تجريبية لنسخة Demo</p>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
