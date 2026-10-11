"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { SETTLEMENT_STATUSES } from "@/lib/constants";
import { Receipt } from "lucide-react";
import { toast } from "sonner";
import type { SettlementStatus } from "@/lib/constants";

export default function AdminSettlementsPage() {
  const { settlements, updateSettlementStatus, addAuditLog, currentUser } = useApp();

  const handleStatusChange = (id: string, status: SettlementStatus) => {
    updateSettlementStatus(id, status);
    addAuditLog({
      actor: currentUser?.name || "مدير",
      actorRole: "admin",
      action: "تحديث تسوية",
      entity: "Settlement",
      entityId: id,
      details: `تحديث حالة التسوية إلى: ${status}`,
    });
    toast.success(`تم تحديث حالة التسوية إلى: ${status}`);
  };

  const totalPending = settlements.filter(s => s.status !== "مدفوع").reduce((s, st) => s + st.merchantAmount, 0);
  const totalPaid = settlements.filter(s => s.status === "مدفوع").reduce((s, st) => s + st.merchantAmount, 0);

  return (
    <DashboardLayout navItems={adminNavItems} title="التسويات" role="admin">
      <h1 className="text-2xl font-bold mb-6">إدارة التسويات</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">إجمالي المستحق للتجار</p><p className="text-xl font-bold text-orange-600">{formatCurrency(totalPending)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">إجمالي المسدد للتجار</p><p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p></CardContent></Card>
      </div>

      {settlements.length === 0 ? (
        <EmptyState icon={Receipt} title="لا توجد تسويات" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاجر</TableHead>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>قيمة البيع</TableHead>
                  <TableHead>المبلغ المستحق للتاجر</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>تحديث</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm">{s.merchantName}</TableCell>
                    <TableCell className="text-sm">{s.orderNumber}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(s.saleValue)}</TableCell>
                    <TableCell className="text-sm font-bold">{formatCurrency(s.merchantAmount)}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(s.date).toLocaleDateString("ar-YE")}</TableCell>
                    <TableCell>
                      <Select onValueChange={(v) => handleStatusChange(s.id, v as SettlementStatus)}>
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="تحديث" /></SelectTrigger>
                        <SelectContent>{SETTLEMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
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
