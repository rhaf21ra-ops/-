"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { Home, CreditCard, Wallet, Bell, User, FileText, TrendingUp, Info, Landmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/financial", label: "الرئيسية", icon: Home },
  { href: "/notifications", label: "الإشعارات", icon: Bell },
  { href: "/profile", label: "الملف الشخصي", icon: User },
];

export default function FinancialDashboardPage() {
  const { installmentApplications, installmentContracts, toYER } = useApp();

  const pendingApplications = installmentApplications.filter(a => a.status === "قيد المراجعة" || a.status === "جديد");
  const activeContracts = installmentContracts.filter(c => c.status === "نشط");
  const totalFinancing = activeContracts.reduce((sum, c) => sum + toYER(c.totalAmount, c.currency), 0);
  const totalRemaining = activeContracts.reduce((sum, c) => sum + toYER(c.remainingAmount, c.currency), 0);

  return (
    <DashboardLayout navItems={navItems} title="الجهة المالية التجريبية" role="admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Landmark className="h-6 w-6 text-primary" />
          لوحة الجهة المالية
        </h1>
        <p className="text-muted-foreground text-sm mt-1">عرض تجريبي للجهة المالية</p>
      </div>

      <Alert className="border-blue-200 bg-blue-50 mb-6">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          هذه لوحة تجريبية للجهة المالية. التكامل الفعلي مع أي بنك أو جهة مالية يتطلب اتفاقية رسمية وAPI معتمد.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="طلبات قيد المراجعة" value={pendingApplications.length} icon={CreditCard} description="بانتظار الدراسة" />
        <StatCard title="عقود نشطة" value={activeContracts.length} icon={FileText} description="عقود قيد السداد" />
        <StatCard title="إجمالي التمويل" value={formatCurrency(totalFinancing)} icon={TrendingUp} description="إجمالي الممول" />
        <StatCard title="المتبقي" value={formatCurrency(totalRemaining)} icon={Wallet} description="إجمالي المتبقي" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">طلبات التمويل الأخيرة</CardTitle>
          <CardDescription>عرض طلبات التقسيط المقدمة</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingApplications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد طلبات قيد المراجعة</p>
          ) : (
            <div className="space-y-3">
              {pendingApplications.map(app => (
                <div key={app.id} className="flex items-center justify-between border rounded-lg p-4">
                  <div>
                    <p className="font-medium text-sm">{app.productName}</p>
                    <p className="text-xs text-muted-foreground">{app.employeeName} · {app.applicationNumber}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">{formatCurrency(app.deferredPrice, app.currency)}</p>
                    <p className="text-xs text-muted-foreground">{app.durationMonths} شهراً</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
