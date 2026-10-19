"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { Home, Users, CreditCard, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/company", label: "الرئيسية", icon: Home },
  { href: "/company/employees", label: "الموظفون", icon: Users },
  { href: "/company/installments", label: "عمليات التقسيط", icon: CreditCard },
  { href: "/company/settings", label: "الإعدادات", icon: Settings },
];

export default function CompanyInstallmentsPage() {
  const { currentUser, companies, employees, installmentApplications, installmentContracts } = useApp();
  const company = companies.find(c => c.userId === currentUser?.id);
  const myEmployees = employees.filter(e => e.companyId === company?.id);
  const myEmployeeIds = myEmployees.map(e => e.id);
  const myApps = installmentApplications.filter(a => myEmployeeIds.includes(a.employeeId));
  const myContracts = installmentContracts.filter(c => myEmployeeIds.includes(c.employeeId));

  return (
    <DashboardLayout navItems={navItems} title="عمليات التقسيط" role="company">
      <h1 className="text-2xl font-bold mb-6">عمليات تقسيط الموظفين</h1>

      <Card className="mb-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>الموظف</TableHead>
                <TableHead>المنتج</TableHead>
                <TableHead>السعر المؤجل</TableHead>
                <TableHead>المدة</TableHead>
                <TableHead>القسط الشهري</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myApps.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد طلبات تقسيط من موظفيك</TableCell></TableRow>
              ) : (
                myApps.map(app => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium text-sm">{app.applicationNumber}</TableCell>
                    <TableCell className="text-sm">{app.employeeName}</TableCell>
                    <TableCell className="text-sm line-clamp-1 max-w-32">{app.productName}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(app.deferredPrice, app.currency)}</TableCell>
                    <TableCell className="text-sm">{app.durationMonths} شهر</TableCell>
                    <TableCell className="text-sm">{formatCurrency(app.monthlyInstallment, app.currency)}</TableCell>
                    <TableCell><StatusBadge status={app.status} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <h2 className="text-lg font-bold mb-4">العقود النشطة</h2>
      {myContracts.length === 0 ? (
        <EmptyState icon={CreditCard} title="لا توجد عقود نشطة" description="لا توجد عقود تقسيط نشطة لموظفي شركتك" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم العقد</TableHead>
                  <TableHead>الموظف</TableHead>
                  <TableHead>المنتج</TableHead>
                  <TableHead>إجمالي العقد</TableHead>
                  <TableHead>المدفوع</TableHead>
                  <TableHead>المتبقي</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myContracts.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{c.contractNumber}</TableCell>
                    <TableCell className="text-sm">{c.employeeName}</TableCell>
                    <TableCell className="text-sm line-clamp-1 max-w-32">{c.productName}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(c.totalAmount, c.currency)}</TableCell>
                    <TableCell className="text-sm text-green-600">{formatCurrency(c.paidAmount, c.currency)}</TableCell>
                    <TableCell className="text-sm text-orange-600">{formatCurrency(c.remainingAmount, c.currency)}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
