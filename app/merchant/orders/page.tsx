"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { ORDER_STATUSES } from "@/lib/constants";
import { Home, Package, ShoppingBag, Boxes, Wallet, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import type { OrderStatus } from "@/lib/constants";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/merchant", label: "الرئيسية", icon: Home },
  { href: "/merchant/products", label: "المنتجات", icon: Package },
  { href: "/merchant/orders", label: "الطلبات", icon: ShoppingBag },
  { href: "/merchant/inventory", label: "المخزون", icon: Boxes },
  { href: "/merchant/settlements", label: "التسويات", icon: Wallet },
  { href: "/merchant/settings", label: "الإعدادات", icon: Settings },
];

export default function MerchantOrdersPage() {
  const { currentUser, merchants, orders, updateOrderStatus, addAuditLog } = useApp();
  const merchant = merchants.find(m => m.userId === currentUser?.id);
  const myOrders = orders.filter(o => o.merchantIds.includes(merchant?.id || ""));

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    updateOrderStatus(orderId, status);
    addAuditLog({
      actor: currentUser?.name || "تاجر",
      actorRole: "merchant",
      action: "تحديث حالة طلب",
      entity: "Order",
      entityId: orderId,
      details: `تحديث حالة الطلب إلى: ${status}`,
    });
    toast.success(`تم تحديث حالة الطلب إلى: ${status}`);
  };

  return (
    <DashboardLayout navItems={navItems} title="الطلبات" role="merchant">
      <h1 className="text-2xl font-bold mb-6">طلبات المتجر</h1>

      {myOrders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="لا توجد طلبات" description="ستظهر طلبات عملائك هنا" />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>المنتج</TableHead>
                  <TableHead>نوع الدفع</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>تحديث الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myOrders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium text-sm">{o.orderNumber}</TableCell>
                    <TableCell className="text-sm">{o.customerName}</TableCell>
                    <TableCell className="text-sm line-clamp-1 max-w-32">{o.items[0]?.productName}</TableCell>
                    <TableCell className="text-sm">{o.paymentType}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(o.total)}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("ar-YE")}</TableCell>
                    <TableCell>
                      <Select onValueChange={(v) => handleStatusChange(o.id, v as OrderStatus)}>
                        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="تحديث" /></SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
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
