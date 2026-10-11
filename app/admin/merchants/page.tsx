"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";

export default function AdminMerchantsPage() {
  const { merchants, products } = useApp();

  return (
    <DashboardLayout navItems={adminNavItems} title="التجار" role="admin">
      <h1 className="text-2xl font-bold mb-6">إدارة التجار</h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المتجر</TableHead>
                <TableHead>المالك</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>المدينة</TableHead>
                <TableHead>عدد المنتجات</TableHead>
                <TableHead>المبيعات</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants.map(m => {
                const productCount = products.filter(p => p.merchantId === m.id).length;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-sm">{m.storeName}</TableCell>
                    <TableCell className="text-sm">{m.ownerName}</TableCell>
                    <TableCell className="text-sm" dir="ltr">{m.phone}</TableCell>
                    <TableCell className="text-sm">{m.city}</TableCell>
                    <TableCell className="text-sm">{productCount}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(m.salesTotal)}</TableCell>
                    <TableCell><StatusBadge status={m.status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
