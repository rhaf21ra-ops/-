"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

export default function InstallmentTermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">شروط برنامج التقسيط</h1>
        <Card>
          <CardContent className="p-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-primary font-medium">
                تنبيه مهم: هذه الشروط تجريبية لنسخة Demo. خدمات التقسيط والدفع الفعلية تخضع مستقبلاً للجهات المرخصة والعقود والتنظيمات المعمول بها في الجمهورية اليمنية.
              </p>
            </div>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">1. الأهلية</h2>
              <p>يشترط للحصول على التقسيط أن يكون المتقدم موظفاً في إحدى الشركات المسجلة في المنصة، وأن يكون حالته "نشط" وأهليته "مؤهل". يتم تحديد حد التقسيط المتاح بناءً على الراتب الشهري.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">2. المدد المتاحة</h2>
              <p>تتاح مدد التقسيط التالية: 6 أشهر، 9 أشهر، 12 شهراً، 18 شهراً، 24 شهراً. يتم اختيار المدة عند تقديم الطلب.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">3. السعر المؤجل</h2>
              <p>السعر المؤجل هو سعر المنتج عند التقسيط، وهو أعلى من السعر النقدي. يتم حساب القسط الشهري بقسمة السعر المؤجل على عدد الأشهر. لا تُستخدم مصطلحات مثل "فائدة" في المنصة، بل يتم استخدام "السعر المؤجل" و"قيمة القسط".</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">4. تقديم الطلب</h2>
              <p>يقدم الموظف طلب التقسيط من صفحة المنتج أو من السلة. يدخل الطلب في حالة "جديد" ثم "قيد المراجعة" حتى تقوم الإدارة بالموافقة أو الرفض.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">5. الموافقة والرفض</h2>
              <p>تقوم الإدارة بمراجعة الطلب بناءً على أهلية الموظف وحد التقسيط المتاح. في حال الموافقة، يتم إنشاء عقد تقسيط وجدول أقساط. في حال الرفض، يتم إشعار الموظف بالسبب.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">6. السداد</h2>
              <p>تبدأ الأقساط في تاريخ الاستحقاق المحدد في العقد. يمكن السداد عبر طرق دفع متعددة (محفظة إلكترونية، تحويل بنكي، نقدي، خصم من الراتب). يتم تحديث حالة القسط إلى "مدفوع" بعد تسجيل الدفعة.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">7. التأخر في السداد</h2>
              <p>في حال التأخر عن سداد القسط في موعد استحقاقه، تتحول حالته إلى "متأخر". التأخر المتكرر قد يؤثر على الأهلية للحصول على تقسيط مستقبلي.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">8. إنهاء العقد</h2>
              <p>ينتهي العقد عند سداد جميع الأقساط، وتتحول حالة العقد إلى "مكتمل". يمكن أيضاً إنهاء العقد مبكراً بسداد المبلغ المتبقي دفعة واحدة.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">9. إخلاء المسؤولية</h2>
              <p>هذه المنصة تجريبية ولا تقدم أي خدمات مالية فعلية أو ملزمة. جميع الأرقام والعمليات المعروضة هي لأغراض العرض التوضيحي فقط. أي خدمات مالية مستقبلية ستخضع للترخيص والتنظيم من قبل الجهات المختصة في الجمهورية اليمنية.</p>
            </section>
            <p className="text-xs text-muted-foreground pt-4 border-t">آخر تحديث: سبتمبر 2026 - هذه شروط تجريبية لنسخة Demo</p>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
