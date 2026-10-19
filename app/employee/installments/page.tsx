"use client";

import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { Home, ShoppingBag, CreditCard, Wallet, Bell, User, Receipt, TrendingDown, CalendarClock, FileText, ArrowLeft, PackagePlus, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/employee", label: "الرئيسية", icon: Home },
  { href: "/employee/orders", label: "طلباتي", icon: ShoppingBag },
  { href: "/employee/installments", label: "التقسيط", icon: CreditCard },
  { href: "/employee/payments", label: "المدفوعات", icon: Wallet },
  { href: "/request-product", label: "طلب منتج غير مدرج", icon: PackagePlus },
  { href: "/requests", label: "طلباتي الخاصة", icon: ClipboardList },
  { href: "/invoices", label: "فواتيري", icon: FileText },
  { href: "/employee/notifications", label: "الإشعارات", icon: Bell },
  { href: "/employee/profile", label: "الملف الشخصي", icon: User },
];

export default function EmployeeInstallmentsPage() {
  const {
    currentUser,
    employees,
    installmentApplications,
    installmentContracts, toYER } = useApp();

  const employee = employees.find((e) => e.userId === currentUser?.id);

  const myApplications = installmentApplications
    .filter((a) => a.employeeId === employee?.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const myContracts = installmentContracts
    .filter((c) => c.employeeId === employee?.id)
    .sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

  const activeContracts = myContracts.filter((c) => c.status === "نشط");
  const totalRemaining = activeContracts.reduce(
    (sum, c) => sum + toYER(c.remainingAmount, c.currency),
    0
  );
  const totalPaid = myContracts.reduce((sum, c) => sum + toYER(c.paidAmount, c.currency), 0);

  const nextDuePayment = activeContracts
    .flatMap((c) =>
      c.payments
        .filter((p) => p.status !== "مدفوع")
        .map((p) => ({ amount: p.amount, dueDate: p.dueDate, productName: c.productName, contractNumber: c.contractNumber }))
    )
    .sort(
      (a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )[0];

  // Find installments due within 7 days
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const upcomingPayments = activeContracts
    .flatMap((c) =>
      c.payments
        .filter((p) => p.status !== "مدفوع")
        .map((p) => ({
          amount: p.amount,
          dueDate: p.dueDate,
          productName: c.productName,
          contractNumber: c.contractNumber,
          status: p.status,
        }))
    )
    .filter((p) => new Date(p.dueDate) <= sevenDaysFromNow)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <DashboardLayout navItems={navItems} title="لوحة الموظف" role="employee">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">التقسيط</h1>
        <p className="text-muted-foreground text-sm mt-1">
          طلبات التقسيط وعقود السداد الخاصة بك
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          title="إجمالي الالتزامات"
          value={formatCurrency(
            activeContracts.reduce((s, c) => s + c.totalAmount, 0)
          )}
          icon={Receipt}
          description="قيمة العقود النشطة"
        />
        <StatCard
          title="المدفوع"
          value={formatCurrency(totalPaid)}
          icon={Wallet}
          description="إجمالي المبالغ المدفوعة"
        />
        <StatCard
          title="المتبقي"
          value={formatCurrency(totalRemaining)}
          icon={TrendingDown}
          description="إجمالي المتبقي للسداد"
        />
        <StatCard
          title="القسط القادم"
          value={nextDuePayment ? formatCurrency(nextDuePayment.amount, nextDuePayment.currency) : "—"}
          icon={CalendarClock}
          description={
            nextDuePayment
              ? `استحقاق ${new Date(
                  nextDuePayment.dueDate
                ).toLocaleDateString("ar-YE")}`
              : "لا يوجد"
          }
        />
      </div>

      {/* Near-due installment alerts */}
      {upcomingPayments.length > 0 && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <CalendarClock className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <p className="font-bold text-sm text-orange-800 mb-2">
              أقساط مستحقة قريباً ({upcomingPayments.length})
            </p>
            <div className="space-y-1.5">
              {upcomingPayments.slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-orange-700">
                  <span>{p.productName} · {p.contractNumber}</span>
                  <span className="font-medium">
                    {formatCurrency(p.amount, p.currency)} - {new Date(p.dueDate).toLocaleDateString("ar-YE")}
                  </span>
                </div>
              ))}
              {upcomingPayments.length > 3 && (
                <p className="text-xs text-orange-600 mt-1">و {upcomingPayments.length - 3} قسط آخر...</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="applications">
        <TabsList className="mb-4">
          <TabsTrigger value="applications">
            طلبات التقسيط ({myApplications.length})
          </TabsTrigger>
          <TabsTrigger value="contracts">
            عقود التقسيط ({myContracts.length})
          </TabsTrigger>
        </TabsList>

        {/* Applications tab */}
        <TabsContent value="applications">
          {myApplications.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="لا توجد طلبات تقسيط"
              description="لم تقم بتقديم أي طلب تقسيط بعد"
              action={
                <Link href="/shop">
                  <Button size="sm">تصفح المتجر</Button>
                </Link>
              }
            />
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>المنتج</TableHead>
                      <TableHead>القسط الشهري</TableHead>
                      <TableHead>المدة</TableHead>
                      <TableHead>السعر المؤجل</TableHead>
                      <TableHead>تاريخ الطلب</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium text-sm">
                          {app.applicationNumber}
                        </TableCell>
                        <TableCell className="text-sm line-clamp-1 max-w-40">
                          {app.productName}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatCurrency(app.monthlyInstallment, app.currency)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {app.durationMonths} شهر
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatCurrency(app.deferredPrice, app.currency)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(app.createdAt).toLocaleDateString("ar-YE")}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={app.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Contracts tab */}
        <TabsContent value="contracts">
          {myContracts.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="لا توجد عقود تقسيط"
              description="لم يتم إبرام أي عقد تقسيط لك بعد"
            />
          ) : (
            <div className="space-y-4">
              {myContracts.map((c) => {
                const progress = Math.round(
                  (c.paidAmount / c.totalAmount) * 100
                );
                const nextPayment = c.payments.find(
                  (p) => p.status !== "مدفوع"
                );
                return (
                  <Card key={c.id}>
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm">
                              {c.contractNumber}
                            </span>
                            <StatusBadge status={c.status} />
                          </div>
                          <p className="text-sm font-medium truncate">
                            {c.productName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {c.paidInstallments} من {c.durationMonths} قسط مدفوع
                          </p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm sm:text-right">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              القسط القادم
                            </p>
                            <p className="font-medium">
                              {nextPayment
                                ? formatCurrency(nextPayment.amount, nextPayment.currency)
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              تاريخ الاستحقاق
                            </p>
                            <p className="font-medium">
                              {nextPayment
                                ? new Date(
                                    nextPayment.dueDate
                                  ).toLocaleDateString("ar-YE")
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              المتبقي
                            </p>
                            <p className="font-medium text-orange-600">
                              {formatCurrency(c.remainingAmount, c.currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">
                            تقدّم السداد
                          </span>
                          <span className="text-xs font-bold text-primary">
                            {progress}%
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      <div className="mt-4">
                        <Link href={`/employee/installments/${c.id}`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            عرض تفاصيل العقد
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
