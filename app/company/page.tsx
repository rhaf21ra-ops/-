"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { Home, Users, CreditCard, Settings, UserPlus, CheckCircle2, XCircle, FileText, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/company", label: "الرئيسية", icon: Home },
  { href: "/company/employees", label: "الموظفون", icon: Users },
  { href: "/company/installments", label: "عمليات التقسيط", icon: CreditCard },
  { href: "/company/settings", label: "الإعدادات", icon: Settings },
];

export default function CompanyDashboard() {
  const { currentUser, companies, employees, installmentApplications, installmentContracts, installmentRequests, companyApproveFinancing, companyRejectFinancing } = useApp();
  const company = companies.find(c => c.userId === currentUser?.id);
  const myEmployees = employees.filter(e => e.companyId === company?.id);
  const activeEmployees = myEmployees.filter(e => e.status === "نشط");
  const myEmployeeIds = myEmployees.map(e => e.id);
  const myEmployeeUserIds = myEmployees.map(e => e.userId);
  const myApps = installmentApplications.filter(a => myEmployeeIds.includes(a.employeeId));
  const myContracts = installmentContracts.filter(c => myEmployeeIds.includes(c.employeeId));
  const activeContracts = myContracts.filter(c => c.status === "نشط");
  const totalOperations = myContracts.reduce((s, c) => s + c.totalAmount, 0);

  // Financing requests from my employees that need company approval
  const pendingFinancingRequests = installmentRequests.filter(
    r => myEmployeeUserIds.includes(r.userId) && r.companyApproved === null && r.status !== "مرفوض"
  );
  const reviewedFinancingRequests = installmentRequests.filter(
    r => myEmployeeUserIds.includes(r.userId) && r.companyApproved !== null
  );

  return (
    <DashboardLayout navItems={navItems} title="لوحة الشركة" role="company">
      {company && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">{company.city} · {company.employeeCount} موظف</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <StatCard label="عدد الموظفين" value={myEmployees.length} icon={Users} color="blue" />
            <StatCard label="الموظفون النشطون" value={activeEmployees.length} icon={UserPlus} color="green" />
            <StatCard label="طلبات التقسيط" value={myApps.length} icon={CreditCard} color="orange" />
            <StatCard label="العمليات النشطة" value={activeContracts.length} icon={CreditCard} color="purple" />
            <StatCard label="إجمالي العمليات" value={formatCurrency(totalOperations)} icon={CreditCard} color="primary" />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">جدول الموظفين</CardTitle>
              <Link href="/company/employees"><span className="text-sm text-primary hover:underline">عرض الكل</span></Link>
            </CardHeader>
            <CardContent className="p-0">
              {myEmployees.length === 0 ? (
                <EmptyState icon={Users} title="لا يوجد موظفون" description="ابدأ بإضافة موظفي شركتك" actionLabel="إضافة موظف" actionHref="/company/employees" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">الاسم</TableHead>
                      <TableHead className="text-xs">رقم الموظف</TableHead>
                      <TableHead className="text-xs">الوظيفة</TableHead>
                      <TableHead className="text-xs">الحالة</TableHead>
                      <TableHead className="text-xs">الأهلية</TableHead>
                      <TableHead className="text-xs">العمليات النشطة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myEmployees.slice(0, 8).map(emp => {
                      const empActive = myContracts.filter(c => c.employeeId === emp.id && c.status === "نشط").length;
                      return (
                        <TableRow key={emp.id}>
                          <TableCell className="text-sm font-medium">{emp.name}</TableCell>
                          <TableCell className="text-sm">{emp.employeeNumber}</TableCell>
                          <TableCell className="text-sm">{emp.jobTitle}</TableCell>
                          <TableCell><StatusBadge status={emp.status} /></TableCell>
                          <TableCell><StatusBadge status={emp.eligibility} /></TableCell>
                          <TableCell className="text-sm">{empActive}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Financing Approval Section */}
          {pendingFinancingRequests.length > 0 && (
            <div className="mt-6">
              <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                طلبات تمويل بانتظار موافقة الشركة ({pendingFinancingRequests.length})
              </h2>
              <Alert className="mb-3 border-blue-200 bg-blue-50">
                <AlertDescription className="text-xs text-blue-800">
                  يجب على الشركة الموافقة على تمويل الموظف قبل أن تتمكن الإدارة من مراجعة الطلب. موافقة الشركة لا تعني الموافقة النهائية على التقسيط.
                </AlertDescription>
              </Alert>
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">رقم الطلب</TableHead>
                        <TableHead className="text-xs">الموظف</TableHead>
                        <TableHead className="text-xs">المنتج</TableHead>
                        <TableHead className="text-xs">القيمة المؤجلة</TableHead>
                        <TableHead className="text-xs">القسط الشهري</TableHead>
                        <TableHead className="text-xs">المدة</TableHead>
                        <TableHead className="text-xs">الحالة</TableHead>
                        <TableHead className="text-xs">إجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingFinancingRequests.map(r => {
                        const emp = myEmployees.find(e => e.userId === r.userId);
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs font-medium">{r.requestNumber}</TableCell>
                            <TableCell className="text-sm">{emp?.name || r.userName}</TableCell>
                            <TableCell className="text-xs line-clamp-1 max-w-32">{r.productName}</TableCell>
                            <TableCell className="text-xs font-medium">{formatCurrency(r.deferredPrice)}</TableCell>
                            <TableCell className="text-xs">{formatCurrency(r.monthlyInstallment)}</TableCell>
                            <TableCell className="text-xs">{r.durationMonths} شهراً</TableCell>
                            <TableCell><StatusBadge status={r.status} /></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={() => { companyApproveFinancing(r.id, "موافقة"); toast.success("تمت الموافقة على طلب التمويل"); }}>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  موافقة
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1 text-red-600" onClick={() => { companyRejectFinancing(r.id, "لا يوافق"); toast.success("تم رفض طلب التمويل"); }}>
                                  <XCircle className="h-3.5 w-3.5" />
                                  رفض
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Reviewed financing requests */}
          {reviewedFinancingRequests.length > 0 && (
            <div className="mt-6">
              <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                طلبات التمويل المراجعة ({reviewedFinancingRequests.length})
              </h2>
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">رقم الطلب</TableHead>
                        <TableHead className="text-xs">الموظف</TableHead>
                        <TableHead className="text-xs">المنتج</TableHead>
                        <TableHead className="text-xs">موافقة الشركة</TableHead>
                        <TableHead className="text-xs">الحالة النهائية</TableHead>
                        <TableHead className="text-xs">ملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviewedFinancingRequests.map(r => {
                        const emp = myEmployees.find(e => e.userId === r.userId);
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs font-medium">{r.requestNumber}</TableCell>
                            <TableCell className="text-sm">{emp?.name || r.userName}</TableCell>
                            <TableCell className="text-xs line-clamp-1 max-w-32">{r.productName}</TableCell>
                            <TableCell>
                              {r.companyApproved ? (
                                <span className="text-green-600 text-xs font-medium">موافق</span>
                              ) : (
                                <span className="text-red-600 text-xs font-medium">مرفوض</span>
                              )}
                            </TableCell>
                            <TableCell><StatusBadge status={r.status} /></TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-40 truncate">{r.companyNotes || "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
