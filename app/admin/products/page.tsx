"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { Package, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminProductsPage() {
  const { products, updateProduct, deleteProduct } = useApp();

  return (
    <DashboardLayout navItems={adminNavItems} title="المنتجات" role="admin">
      <h1 className="text-2xl font-bold mb-6">إدارة المنتجات ({products.length})</h1>

      {products.length === 0 ? (
        <EmptyState icon={Package} title="لا توجد منتجات" />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>التاجر</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>السعر النقدي</TableHead>
                  <TableHead>المخزون</TableHead>
                  <TableHead>الظهور</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                        <span className="line-clamp-1 max-w-40">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.merchantName}</TableCell>
                    <TableCell className="text-sm">{p.category}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(p.cashPrice)}</TableCell>
                    <TableCell className="text-sm">{p.stock}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${p.visible ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                        {p.visible ? "ظاهر" : "مخفي"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { updateProduct(p.id, { visible: !p.visible }); toast.success(`تم ${p.visible ? "إخفاء" : "إظهار"} المنتج`); }}>
                          {p.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { deleteProduct(p.id); toast.success("تم حذف المنتج"); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
