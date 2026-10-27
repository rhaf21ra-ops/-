"use client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { InstallmentCalculator } from "@/components/InstallmentCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CalculatorAdmin(){
  return (
    <DashboardLayout navItems={adminNavItems} title="حاسبة التقسيط" role="admin">
      <h1 className="text-2xl font-bold">حاسبة التقسيط الاحترافية</h1><p className="text-sm text-muted-foreground mb-6">جرب حساب الأقساط - النسب قابلة للتعديل من الإعدادات</p>
      <InstallmentCalculator />
      <Card className="mt-6 bg-blue-50 border-blue-200"><CardHeader><CardTitle className="text-sm">كيف تعدل النسب؟</CardTitle></CardHeader><CardContent className="text-xs">اذهب إلى `/admin/settings/advanced` → عدل `installment_rates` (مثلاً: 3 أشهر 5%، 12 شهر 15%) → احفظ → الحاسبة ستستخدم النسب الجديدة تلقائياً</CardContent></Card>
    </DashboardLayout>
  );
}
