"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/brand";

export default function AdminMerchantsPage() {
  const { merchants, products, setMerchantStatus, setMerchantCommission } = useApp();
  const { user } = useAuth();
  const canManage = !!user && (user.roles.includes("admin") || user.permissions.includes("merchants.manage"));
  const isOwner = !!user?.roles.includes("admin");
  const [commission, setCommission] = useState<Record<string, string>>({});

  return (
    <DashboardLayout navItems={adminNavItems} title="التجار" role="admin">
      <h1 className="text-2xl font-bold mb-6">إدارة التجار</h1>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المتجر</TableHead>
                <TableHead>المالك</TableHead>
                <TableHead>عدد المنتجات</TableHead>
                <TableHead>المبيعات</TableHead>
                <TableHead>العمولة %</TableHead>
                <TableHead>الحالة</TableHead>
                {canManage && <TableHead>إجراء</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">لا يوجد تجار بعد</TableCell></TableRow>}
              {merchants.map(m => {
                const productCount = products.filter(p => p.merchantId === m.id).length;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-sm">{m.storeName}</TableCell>
                    <TableCell className="text-sm">{m.ownerName}</TableCell>
                    <TableCell className="text-sm">{productCount}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(m.salesTotal)}</TableCell>
                    <TableCell className="text-sm">
                      {isOwner ? (
                        <div className="flex items-center gap-1">
                          <input type="number" min={1} max={10} step={1} className="h-8 w-16 rounded border px-2 text-sm"
                            value={commission[m.id] ?? String(m.commissionPercent ?? 5)}
                            onChange={e => setCommission({ ...commission, [m.id]: e.target.value })} />
                          <Button size="sm" variant="outline" onClick={() => setMerchantCommission(m.id, Number(commission[m.id] ?? m.commissionPercent ?? 5))}>حفظ</Button>
                        </div>
                      ) : <span>{m.commissionPercent ?? 5}</span>}
                    </TableCell>
                    <TableCell><StatusBadge status={m.status} /></TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1">
                          {m.status !== "نشط" && <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setMerchantStatus(m.id, "نشط")}>تفعيل</Button>}
                          {m.status !== "موقوف" && <Button size="sm" variant="destructive" onClick={() => setMerchantStatus(m.id, "موقوف")}>إيقاف</Button>}
                        </div>
                      </TableCell>
                    )}
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
