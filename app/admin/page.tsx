"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import type { Currency } from "@/lib/currency";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { Home, Users, Store, Building2, Package, ShoppingBag, CreditCard, Wallet, Receipt, BarChart3, Settings, FileText, ScrollText, Truck, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "الرئيسية", icon: Home },
  { href: "/admin/users", label: "المستخدمون", icon: Users },
  { href: "/admin/merchants", label: "التجار", icon: Store },
  { href: "/admin/companies", label: "الشركات", icon: Building2 },
  { href: "/admin/products", label: "المنتجات", icon: Package },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingBag },
  { href: "/admin/installments", label: "التقسيط", icon: CreditCard },
  { href: "/admin/payments", label: "المدفوعات", icon: Wallet },
  { href: "/admin/delivery", label: "التوصيل", icon: Truck },
  { href: "/admin/settlements", label: "التسويات", icon: Receipt },
  { href: "/admin/reports", label: "التقارير", icon: BarChart3 },
  { href: "/admin/audit-logs", label: "سجل العمليات", icon: ScrollText },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

const MONTH_NAMES = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const PIE_COLORS = ["hsl(158, 64%, 30%)", "hsl(217, 91%, 60%)", "hsl(43, 74%, 66%)", "hsl(0, 84%, 60%)", "hsl(280, 65%, 60%)", "hsl(200, 70%, 50%)"];

function buildMonthlyData(orders: { createdAt: string; total: number; currency?: Currency }[], fx: (n: number, c?: Currency) => number) {
  const now = new Date();
  const months: { month: string; sales: number; orders: number }[] = [];
  for (let i = 8; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const monthOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const od = new Date(o.createdAt);
      return `${od.getFullYear()}-${od.getMonth()}` === key;
    });
    months.push({
      month: MONTH_NAMES[d.getMonth()],
      sales: monthOrders.reduce((s, o) => s + fx(o.total, o.currency), 0),
      orders: monthOrders.length,
    });
  }
  return months;
}

function buildCategoryData(products: { category: string; visible: boolean }[]) {
  const counts = new Map<string, number>();
  for (const p of products) {
    const cat = p.category || "أخرى";
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
}

export default function AdminDashboard() {
  const { users, employees, merchants, companies, products, orders, installmentApplications, installmentContracts, payments, settlements, toYER } = useApp();

  const totalSales = orders.reduce((s, o) => s + toYER(o.total, o.currency), 0);
  const totalPayments = payments.filter(p => p.status === "ناجح").reduce((s, p) => s + toYER(p.amount, p.currency), 0);
  const activeInstallments = installmentContracts.filter(c => c.status === "نشط").length;

  const monthlyData = buildMonthlyData(orders, toYER);
  const categoryData = buildCategoryData(products);

  return (
    <DashboardLayout navItems={navItems} title="لوحة الإدارة" role="admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">لوحة تحكم المنصة</h1>
        <p className="text-muted-foreground text-sm mt-1">نظرة عامة على المنصة</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="إجمالي المستخدمين" value={users.length} icon={Users} color="blue" />
        <StatCard label="الموظفون" value={employees.length} icon={Users} color="green" />
        <StatCard label="التجار" value={merchants.length} icon={Store} color="orange" />
        <StatCard label="الشركات" value={companies.length} icon={Building2} color="purple" />
        <StatCard label="المنتجات" value={products.length} icon={Package} color="blue" />
        <StatCard label="الطلبات" value={orders.length} icon={ShoppingBag} color="green" />
        <StatCard label="طلبات التقسيط" value={installmentApplications.length} icon={CreditCard} color="orange" />
        <StatCard label="العمليات النشطة" value={activeInstallments} icon={CreditCard} color="purple" />
        <StatCard label="إجمالي المبيعات" value={formatCurrency(totalSales)} icon={Wallet} color="green" />
        <StatCard label="المدفوعات" value={formatCurrency(totalPayments)} icon={Wallet} color="blue" />
        <StatCard label="التسويات" value={settlements.length} icon={Receipt} color="orange" />
        <StatCard label="المنتجات المتاحة" value={products.filter(p => p.visible).length} icon={Package} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">المبيعات الشهرية</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="sales" fill="hsl(158, 64%, 30%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">الطلبات الشهرية</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line dataKey="orders" stroke="hsl(217, 91%, 60%)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">توزيع المنتجات حسب التصنيف</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e: any) => e.name}>
                  {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">أحدث الطلبات</CardTitle></CardHeader>
          <CardContent className="p-0">
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
                {orders.slice(0, 6).map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs font-medium">{o.orderNumber}</TableCell>
                    <TableCell className="text-xs">{o.customerName}</TableCell>
                    <TableCell className="text-xs">{formatCurrency(o.total, o.currency)}</TableCell>
                    <TableCell className="text-xs">{o.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
