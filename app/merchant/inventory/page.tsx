"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { Home, Package, ShoppingBag, Boxes, Wallet, Settings, AlertTriangle, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/merchant", label: "الرئيسية", icon: Home },
  { href: "/merchant/products", label: "المنتجات", icon: Package },
  { href: "/merchant/orders", label: "الطلبات", icon: ShoppingBag },
  { href: "/merchant/inventory", label: "المخزون", icon: Boxes },
  { href: "/merchant/settlements", label: "التسويات", icon: Wallet },
  { href: "/invoices", label: "الفواتير", icon: FileText },
  { href: "/merchant/settings", label: "الإعدادات", icon: Settings },
];

export default function MerchantInventoryPage() {
  const { currentUser, merchants, products, updateProduct, isReal } = useApp();
  const merchant = merchants.find(m => m.userId === currentUser?.id);
  const myProducts = products.filter(p => p.merchantId === merchant?.id);

  const lowStock = myProducts.filter(p => p.stock <= 5);

  return (
    <DashboardLayout navItems={navItems} title="المخزون" role="merchant">
      <h1 className="text-2xl font-bold mb-6">إدارة المخزون</h1>

      {lowStock.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
            <p className="text-sm text-orange-800">
              لديك {lowStock.length} منتج بكمية منخفضة (أقل من 5 قطع). يُنصح بإعادة التخزين.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المنتج</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>المخزون</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تحديث المخزون</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myProducts.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm line-clamp-1 max-w-40">{p.name}</TableCell>
                  <TableCell className="text-sm">{p.category}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(p.cashPrice, p.currency)}</TableCell>
                  <TableCell className="text-sm font-bold">{p.stock}</TableCell>
                  <TableCell>
                    {p.stock === 0 ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">نفذ</span>
                    ) : p.stock <= 5 ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">منخفض</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">متوفر</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        defaultValue={p.stock}
                        className="h-8 w-20 text-sm"
                        onBlur={e => {
                          const val = Number(e.target.value);
                          if (val !== p.stock) {
                            updateProduct(p.id, { stock: val });
                            if (!isReal) toast.success("تم تحديث المخزون");
                          }
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
