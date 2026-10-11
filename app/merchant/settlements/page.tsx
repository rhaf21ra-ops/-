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
import { Home, Package, ShoppingBag, Boxes, Wallet, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import type { SettlementStatus } from "@/lib/constants";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/merchant", label: "الرئيسية", icon: Home },
  { href: "/merchant/products", label: "المنتجات", icon: Package },
  { href: "/merchant/orders", label: "الطلبات", icon: ShoppingBag },
  { href: "/merchant/inventory", label: "المخزون", icon: Boxes },
  { href: "/merchant/settlements", label: "التسويات", icon: Wallet },
  { href: "/merchant/settings", label: "الإعدادات", icon: Settings },
];

export default function MerchantSettlementsPage() {
  const { currentUser, merchants, settlements, updateSettlementStatus } = useApp();
  const merchant = merchants.find(m => m.userId === currentUser?.id);
  const mySettlements = settlements.filter(s => s.merchantId === merchant?.id);

  const totalPending = mySettlements.filter(s => s.status !== "مدفوع").reduce((s, st) => s + st.merchantAmount, 0);
  const totalPaid = mySettlements.filter(s => s.status === "مدفوع").reduce((s, st) => s + st.merchantAmount, 0);

  return (
    <DashboardLayout navItems={navItems} title="التسويات" role="merchant">
      <h1 className="text-2xl font-bold mb-6">التسويات المالية</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">إجمالي المستحق</p><p className="text-xl font-bold text-orange-600">{formatCurrency(totalPending)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">إجمالي المسدد</p><p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p></CardContent></Card>
      </div>

      {mySettlements.length === 0 ? (
        <EmptyState icon={Wallet} title="لا توجد تسويات" description="ستظهر التسويات المالية هنا بعد إتمام الطلبات" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>قيمة البيع</TableHead>
                  <TableHead>المبلغ المستحق</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mySettlements.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm">{s.orderNumber}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(s.saleValue)}</TableCell>
                    <TableCell className="text-sm font-bold">{formatCurrency(s.merchantAmount)}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(s.date).toLocaleDateString("ar-YE")}</TableCell>
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
