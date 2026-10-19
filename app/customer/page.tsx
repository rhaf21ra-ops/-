"use client";

import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { Home, ShoppingBag, CreditCard, Wallet, Bell, User, CalendarClock, TrendingDown, Receipt, ArrowLeft, ShieldCheck, Info, PackagePlus, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/customer", label: "الرئيسية", icon: Home },
  { href: "/employee/orders", label: "طلباتي", icon: ShoppingBag },
  { href: "/employee/installments", label: "أقساطي", icon: CreditCard },
  { href: "/employee/payments", label: "المدفوعات", icon: Wallet },
  { href: "/request-product", label: "طلب منتج غير مدرج", icon: PackagePlus },
  { href: "/requests", label: "طلباتي الخاصة", icon: ClipboardList },
  { href: "/employee/notifications", label: "الإشعارات", icon: Bell },
  { href: "/employee/profile", label: "الملف الشخصي", icon: User },
];

export default function CustomerDashboardPage() {
  const { currentUser, orders, installmentContracts } = useApp();

  const myOrders = orders.filter((o) => o.customerId === currentUser?.id);
  const myContracts = installmentContracts.filter((c) => c.employeeId === currentUser?.id);
  const activeContracts = myContracts.filter((c) => c.status === "نشط");

  const totalRemaining = activeContracts.reduce(
    (sum, c) => sum + c.remainingAmount,
    0
  );
  const ordersCount = myOrders.length;

  const nextDuePayment = activeContracts
    .flatMap((c) =>
      c.payments
        .filter((p) => p.status !== "مدفوع")
        .map((p) => ({
          contractId: c.id,
          contractNumber: c.contractNumber,
          productName: c.productName,
          amount: p.amount,
          dueDate: p.dueDate,
          number: p.number,
        }))
    )
    .sort(
      (a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )[0];

  const recentOrders = [...myOrders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  const verificationStatus = currentUser?.verificationStatus || "لم يتم التحقق";

  return (
    <DashboardLayout navItems={navItems} title="لوحة العميل" role="customer">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          أهلاً، {currentUser?.name || "عميل"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          مرحباً بك في لوحة العميل
        </p>
      </div>

      {/* Verification status banner */}
      <div className="mb-6">
        <Alert className={
          verificationStatus === "تم التحقق" ? "border-green-200 bg-green-50" :
          verificationStatus === "بانتظار المراجعة" ? "border-yellow-200 bg-yellow-50" :
          verificationStatus === "طلب إعادة الرفع" ? "border-orange-200 bg-orange-50" :
          verificationStatus === "تعذر التحقق" ? "border-red-200 bg-red-50" :
          "border-blue-200 bg-blue-50"
        }>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm">
              حالة التحقق من الهوية: <StatusBadge status={verificationStatus} />
            </span>
            {verificationStatus !== "تم التحقق" && (
              <Link href="/profile">
                <Button size="sm" variant="outline">
                  {verificationStatus === "لم يتم التحقق" ? "رفع الوثائق" : "عرض التفاصيل"}
                </Button>
              </Link>
            )}
          </AlertDescription>
        </Alert>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          title="عقود التقسيط النشطة"
          value={activeContracts.length}
          icon={CreditCard}
          description="عقود قيد السداد"
        />
        <StatCard
          title="إجمالي المتبقي"
          value={formatCurrency(totalRemaining)}
          icon={TrendingDown}
          description="إجمالي الديون المتبقية"
        />
        <StatCard
          title="عدد الطلبات"
          value={ordersCount}
          icon={ShoppingBag}
          description="إجمالي طلباتي"
        />
        <StatCard
          title="القسط القادم"
          value={nextDuePayment ? formatCurrency(nextDuePayment.amount) : "—"}
          icon={CalendarClock}
          description={
            nextDuePayment
              ? `استحقاق ${new Date(nextDuePayment.dueDate).toLocaleDateString("ar-YE")}`
              : "لا يوجد قسط قادم"
          }
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">آخر الطلبات</CardTitle>
              <CardDescription>أحدث 5 طلبات قمت بها</CardDescription>
            </div>
            <Link href="/employee/orders">
              <Button variant="ghost" size="sm" className="gap-1">
                عرض الكل
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="لا توجد طلبات حالياً"
                description="ابدأ التسوق وستظهر طلباتك هنا"
                action={
                  <Link href="/shop">
                    <Button size="sm">تصفح المتجر</Button>
                  </Link>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">رقم الطلب</TableHead>
                    <TableHead className="text-xs">التاريخ</TableHead>
                    <TableHead className="text-xs">المبلغ</TableHead>
                    <TableHead className="text-xs">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-xs font-medium">
                        {o.orderNumber}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString("ar-YE")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatCurrency(o.total)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Active installment contracts with progress bars */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">عقود التقسيط النشطة</CardTitle>
              <CardDescription>تقدّم السداد لكل عقد</CardDescription>
            </div>
            <Link href="/employee/installments">
              <Button variant="ghost" size="sm" className="gap-1">
                عرض الكل
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {activeContracts.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="لا توجد عقود تقسيط نشطة"
                description="لم يبدأ أي عقد تقسيط بعد"
              />
            ) : (
              <div className="space-y-4">
                {activeContracts.slice(0, 5).map((c) => {
                  const progress = Math.round(
                    (c.paidAmount / c.totalAmount) * 100
                  );
                  return (
                    <Link
                      key={c.id}
                      href={`/employee/installments/${c.id}`}
                      className="block rounded-lg border p-4 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {c.productName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.contractNumber} · {c.paidInstallments} من{" "}
                            {c.durationMonths} قسط
                          </p>
                        </div>
                        <span className="text-sm font-bold text-primary shrink-0">
                          {progress}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-2 mb-2" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-green-600">
                          مدفوع: {formatCurrency(c.paidAmount)}
                        </span>
                        <span className="text-orange-600">
                          متبقي: {formatCurrency(c.remainingAmount)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
