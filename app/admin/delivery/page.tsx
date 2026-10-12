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
import { DELIVERY_STATUSES } from "@/lib/constants";
import { Truck } from "lucide-react";
import { toast } from "sonner";
import type { DeliveryStatus } from "@/lib/constants";

export default function AdminDeliveryPage() {
  const { deliveries, updateDeliveryStatus, addAuditLog, currentUser, isReal } = useApp();

  const handleStatusChange = (id: string, status: DeliveryStatus) => {
    updateDeliveryStatus(id, status);
    addAuditLog({
      actor: currentUser?.name || "مدير",
      actorRole: "admin",
      action: "تحديث حالة توصيل",
      entity: "Delivery",
      entityId: id,
      details: `تحديث حالة التوصيل إلى: ${status}`,
    });
    if (!isReal) toast.success(`تم تحديث حالة التوصيل إلى: ${status}`);
  };

  return (
    <DashboardLayout navItems={adminNavItems} title="التوصيل" role="admin">
      <h1 className="text-2xl font-bold mb-6">إدارة التوصيل</h1>

      {deliveries.length === 0 ? (
        <EmptyState icon={Truck} title="لا توجد عمليات توصيل" />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>المحافظة</TableHead>
                  <TableHead>المدينة</TableHead>
                  <TableHead>المنطقة</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>ملاحظات</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تحديث</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-sm">{d.orderNumber}</TableCell>
                    <TableCell className="text-sm">{d.customerName}</TableCell>
                    <TableCell className="text-sm">{d.governorate}</TableCell>
                    <TableCell className="text-sm">{d.city}</TableCell>
                    <TableCell className="text-sm">{d.area}</TableCell>
                    <TableCell className="text-sm" dir="ltr">{d.phone}</TableCell>
                    <TableCell className="text-sm line-clamp-1 max-w-28">{d.notes || "—"}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                    <TableCell>
                      <Select onValueChange={(v) => handleStatusChange(d.id, v as DeliveryStatus)}>
                        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="تحديث" /></SelectTrigger>
                        <SelectContent>{DELIVERY_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
