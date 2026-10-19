"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { ORDER_STATUSES, INSTALLMENT_REQUEST_STATUSES } from "@/lib/constants";
import { Home, ShoppingBag, CreditCard, Wallet, Bell, User, Package, ExternalLink, FileText, CheckCircle2, XCircle, Clock, AlertCircle, PackagePlus, ClipboardList } from "lucide-react";
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

const ALL = "الكل";

export default function EmployeeOrdersPage() {
  const { currentUser, employees, orders, installmentRequests } = useApp();
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [reqStatusFilter, setReqStatusFilter] = useState<string>(ALL);

  const employee = employees.find((e) => e.userId === currentUser?.id);

  const myOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.customerId === employee?.id || o.customerId === currentUser?.id
      ),
    [orders, employee, currentUser]
  );

  const filteredOrders = useMemo(() => {
    const sorted = [...myOrders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (statusFilter === ALL) return sorted;
    return sorted.filter((o) => o.status === statusFilter);
  }, [myOrders, statusFilter]);

  const myRequests = useMemo(
    () => installmentRequests.filter((r) => r.userId === currentUser?.id),
    [installmentRequests, currentUser]
  );

  const filteredRequests = useMemo(() => {
    const sorted = [...myRequests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (reqStatusFilter === ALL) return sorted;
    return sorted.filter((r) => r.status === reqStatusFilter);
  }, [myRequests, reqStatusFilter]);

  const requestStatusIcon = (status: string) => {
    if (status === "موافق") return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
    if (status === "مرفوض") return <XCircle className="h-3.5 w-3.5 text-red-600" />;
    if (status === "مكتمل") return <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />;
    if (status.includes("بانتظار")) return <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />;
    return <Clock className="h-3.5 w-3.5 text-blue-600" />;
  };

  return (
    <DashboardLayout navItems={navItems} title="لوحة الموظف" role="employee">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">طلباتي</h1>
        <p className="text-muted-foreground text-sm mt-1">
          جميع طلباتك من المتجر
        </p>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="orders" className="gap-1">
            <ShoppingBag className="h-4 w-4" />
            الطلبات
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-1">
            <FileText className="h-4 w-4" />
            طلبات التقسيط
            {myRequests.length > 0 && (
              <span className="mr-1 rounded-full bg-primary/10 px-1.5 text-xs text-primary">{myRequests.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          تصفية حسب الحالة:
        </span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="كل الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>كل الحالات</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="لا توجد طلبات"
          description={
            statusFilter === ALL
              ? "ابدأ التسوق وستظهر طلباتك هنا"
              : "لا توجد طلبات بهذه الحالة"
          }
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
                  <TableHead>التاريخ</TableHead>
                  <TableHead>عدد المنتجات</TableHead>
                  <TableHead>المنتج</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead>نوع الدفع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((o) => {
                  const itemsCount = o.items.reduce(
                    (sum, it) => sum + it.quantity,
                    0
                  );
                  const firstProduct = o.items[0];
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium text-sm">
                        {o.orderNumber}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString("ar-YE")}
                      </TableCell>
                      <TableCell className="text-sm">{itemsCount}</TableCell>
                      <TableCell className="text-sm line-clamp-1 max-w-40">
                        {firstProduct?.productName || "—"}
                        {o.items.length > 1 && (
                          <span className="text-muted-foreground">
                            {" "}
                            (+{o.items.length - 1})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatCurrency(o.total)}
                      </TableCell>
                      <TableCell className="text-sm">{o.paymentType}</TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
                      </TableCell>
                      <TableCell>
                        {firstProduct && (
                          <Link
                            href="/shop"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            المنتج
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="requests">
          {/* Installment Requests Filter */}
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              تصفية حسب الحالة:
            </span>
            <Select value={reqStatusFilter} onValueChange={setReqStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="كل الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>كل الحالات</SelectItem>
                {INSTALLMENT_REQUEST_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredRequests.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="لا توجد طلبات تقسيط"
              description={
                reqStatusFilter === ALL
                  ? "لم تقم بأي طلب تقسيط بعد"
                  : "لا توجد طلبات بهذه الحالة"
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
                      <TableHead>القيمة المؤجلة</TableHead>
                      <TableHead>المدة</TableHead>
                      <TableHead>القسط الشهري</TableHead>
                      <TableHead>موافقة الشركة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm">{r.requestNumber}</TableCell>
                        <TableCell className="text-sm line-clamp-1 max-w-40">{r.productName}</TableCell>
                        <TableCell className="text-sm font-medium">{formatCurrency(r.deferredPrice)}</TableCell>
                        <TableCell className="text-sm">{r.durationMonths} شهراً</TableCell>
                        <TableCell className="text-sm">{formatCurrency(r.monthlyInstallment)}</TableCell>
                        <TableCell className="text-sm">
                          {r.companyApproved === null || r.companyApproved === undefined ? (
                            <span className="text-muted-foreground">—</span>
                          ) : r.companyApproved ? (
                            <span className="text-green-600 font-medium">موافق</span>
                          ) : (
                            <span className="text-red-600 font-medium">مرفوض</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {requestStatusIcon(r.status)}
                            <StatusBadge status={r.status} />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString("ar-YE")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
