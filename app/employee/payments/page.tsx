"use client";

import { useMemo } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Home, ShoppingBag, CreditCard, Wallet, Bell, User, Receipt, CheckCircle2, ArrowLeft, PackagePlus, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/employee", label: "الرئيسية", icon: Home },
  { href: "/employee/orders", label: "طلباتي", icon: ShoppingBag },
  { href: "/employee/installments", label: "التقسيط", icon: CreditCard },
  { href: "/employee/payments", label: "المدفوعات", icon: Wallet },
  { href: "/request-product", label: "طلب منتج غير مدرج", icon: PackagePlus },
  { href: "/requests", label: "طلباتي الخاصة", icon: ClipboardList },
  { href: "/employee/notifications", label: "الإشعارات", icon: Bell },
  { href: "/employee/profile", label: "الملف الشخصي", icon: User },
];

export default function EmployeePaymentsPage() {
  const { currentUser, employees, installmentContracts, payments } = useApp();

  const employee = employees.find((e) => e.userId === currentUser?.id);
  const myContracts = installmentContracts.filter(
    (c) => c.employeeId === employee?.id
  );
  const myContractIds = new Set(myContracts.map((c) => c.id));

  const myPayments = useMemo(
    () =>
      payments
        .filter((p) => myContractIds.has(p.contractId))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [payments, myContractIds]
  );

  const totalPaid = myPayments
    .filter((p) => p.status === "ناجح")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <DashboardLayout navItems={navItems} title="لوحة الموظف" role="employee">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">سجل المدفوعات</h1>
        <p className="text-muted-foreground text-sm mt-1">
          جميع الدفعات التي قمت بتسديدها لعقود التقسيط
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard
          title="إجمالي المدفوع"
          value={formatCurrency(totalPaid)}
          icon={Wallet}
          description="مجموع الدفعات الناجحة"
        />
        <StatCard
          title="عدد الدفعات"
          value={myPayments.length}
          icon={CheckCircle2}
          description="إجمالي العمليات"
        />
        <StatCard
          title="عقود التقسيط"
          value={myContracts.length}
          icon={Receipt}
          description="عقود مرتبطة بحسابك"
        />
      </div>

      {myPayments.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="لا توجد مدفوعات"
          description="لم تقم بتسديد أي دفعة بعد. ستظهر هنا جميع مدفوعاتك عند سداد الأقساط."
          action={
            <Link href="/employee/installments">
              <Button size="sm" className="gap-1">
                عرض عقود التقسيط
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الدفعة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>القسط</TableHead>
                  <TableHead>العقد</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myPayments.map((p) => {
                  const contract = myContracts.find(
                    (c) => c.id === p.contractId
                  );
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">
                        {p.paymentNumber}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString("ar-YE")}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell className="text-sm">{p.method}</TableCell>
                      <TableCell className="text-sm">
                        {p.installmentNumber
                          ? `القسط ${p.installmentNumber}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {contract ? (
                          <Link
                            href={`/employee/installments/${contract.id}`}
                            className="text-primary hover:underline"
                          >
                            {contract.contractNumber}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
