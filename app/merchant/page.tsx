"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { Home, Package, ShoppingBag, Boxes, Wallet, Store, Settings, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/merchant", label: "الرئيسية", icon: Home },
  { href: "/merchant/products", label: "المنتجات", icon: Package },
  { href: "/merchant/orders", label: "الطلبات", icon: ShoppingBag },
  { href: "/merchant/inventory", label: "المخزون", icon: Boxes },
  { href: "/merchant/settlements", label: "التسويات", icon: Wallet },
  { href: "/invoices", label: "الفواتير", icon: FileText },
  { href: "/merchant/settings", label: "الإعدادات", icon: Settings },
];

export default function MerchantDashboard() {
  const { currentUser, merchants, products, orders, settlements, toYER } = useApp();
  const merchant = merchants.find(m => m.userId === currentUser?.id);
  const myProducts = products.filter(p => p.merchantId === merchant?.id);
  const myOrders = orders.filter(o => o.merchantIds.includes(merchant?.id || ""));
  const mySettlements = settlements.filter(s => s.merchantId === merchant?.id);

  const newOrders = myOrders.filter(o => o.status === "جديد" || o.status === "تمت الموافقة");
  const preparingOrders = myOrders.filter(o => o.status === "قيد التجهيز");
  const completedOrders = myOrders.filter(o => o.status === "تم التسليم");
  const totalSales = completedOrders.reduce((s, o) => s + toYER(o.total, o.currency), 0);
  const pendingAmount = mySettlements.filter(s => s.status !== "مدفوع").reduce((s, st) => s + toYER(st.merchantAmount, st.currency), 0);
  const paidAmount = mySettlements.filter(s => s.status === "مدفوع").reduce((s, st) => s + toYER(st.merchantAmount, st.currency), 0);

  return (
    <DashboardLayout navItems={navItems} title="لوحة التاجر" role="merchant">
      {merchant && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{merchant.storeName}</h1>
            <p className="text-muted-foreground text-sm mt-1">{merchant.city} · تقييم {merchant.rating} ★</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <StatCard label="إجمالي المبيعات" value={formatCurrency(totalSales)} icon={Wallet} color="green" />
            <StatCard label="طلبات جديدة" value={newOrders.length} icon={ShoppingBag} color="blue" />
            <StatCard label="قيد التجهيز" value={preparingOrders.length} icon={Package} color="orange" />
            <StatCard label="الطلبات المكتملة" value={completedOrders.length} icon={Boxes} color="purple" />
            <StatCard label="مبالغ مستحقة" value={formatCurrency(pendingAmount)} icon={Wallet} color="red" />
            <StatCard label="مبالغ مسددة" value={formatCurrency(paidAmount)} icon={Wallet} color="green" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">أحدث الطلبات</CardTitle>
                <Link href="/merchant/orders"><span className="text-sm text-primary hover:underline">عرض الكل</span></Link>
              </CardHeader>
              <CardContent>
                {myOrders.length === 0 ? (
                  <EmptyState icon={ShoppingBag} title="لا توجد طلبات" description="ستظهر طلبات عملائك هنا" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">الطلب</TableHead>
                        <TableHead className="text-xs">العميل</TableHead>
                        <TableHead className="text-xs">المبلغ</TableHead>
                        <TableHead className="text-xs">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myOrders.slice(0, 5).map(o => (
                        <TableRow key={o.id}>
                          <TableCell className="text-xs font-medium">{o.orderNumber}</TableCell>
                          <TableCell className="text-xs">{o.customerName}</TableCell>
                          <TableCell className="text-xs">{formatCurrency(o.total, o.currency)}</TableCell>
                          <TableCell><StatusBadge status={o.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">المنتجات</CardTitle>
                <Link href="/merchant/products"><span className="text-sm text-primary hover:underline">عرض الكل</span></Link>
              </CardHeader>
              <CardContent>
                {myProducts.length === 0 ? (
                  <EmptyState icon={Package} title="لا توجد منتجات" description="ابدأ بإضافة منتجاتك" actionLabel="إضافة منتج" actionHref="/merchant/products" />
                ) : (
                  <div className="space-y-2">
                    {myProducts.slice(0, 5).map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <img src={p.images[0]} alt="" className="w-10 h-10 rounded object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                          <p className="text-xs text-muted-foreground">المخزون: {p.stock}</p>
                        </div>
                        <span className="text-sm font-bold text-primary">{formatCurrency(p.cashPrice, p.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
