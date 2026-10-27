"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { ORDER_STATUSES, GOVERNORATES } from "@/lib/constants";
import { Search } from "lucide-react";
import { useState } from "react";
import type { OrderStatus } from "@/lib/constants";

export default function AdminOrdersPage() {
  const { orders } = useApp();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const filtered = orders.filter(o => {
    if (search && !o.orderNumber.includes(search) && !o.customerName.includes(search)) return false;
    if (statusFilter && o.status !== statusFilter) return false;
    if (paymentFilter && o.paymentType !== paymentFilter) return false;
    if (cityFilter && o.city !== cityFilter) return false;
    return true;
  });

  return (
    <DashboardLayout navItems={adminNavItems} title="الطلبات" role="admin">
      <h1 className="text-2xl font-bold mb-6">إدارة الطلبات</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="ابحث برقم الطلب أو العميل..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="كل الحالات" /></SelectTrigger>
          <SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="نوع الدفع" /></SelectTrigger>
          <SelectContent><SelectItem value="نقدي">نقدي</SelectItem><SelectItem value="تقسيط">تقسيط</SelectItem></SelectContent>
        </Select>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="المدينة" /></SelectTrigger>
          <SelectContent>{GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>التاجر</TableHead>
                <TableHead>المنتج</TableHead>
                <TableHead>نوع الدفع</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>المدينة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium text-sm">{o.orderNumber}</TableCell>
                  <TableCell className="text-sm">{o.customerName}</TableCell>
                  <TableCell className="text-sm">{o.items[0]?.merchantName}</TableCell>
                  <TableCell className="text-sm line-clamp-1 max-w-32">{o.items[0]?.productName}</TableCell>
                  <TableCell className="text-sm">{o.paymentType}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(o.total, o.currency)}</TableCell>
                  <TableCell className="text-sm">{o.city}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("ar-YE")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
