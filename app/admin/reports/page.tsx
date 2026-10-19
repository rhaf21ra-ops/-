"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { Users, Store, Building2, Wallet, ShoppingBag, CreditCard, Package, Truck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const MONTH_NAMES = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const PIE_COLORS = ["hsl(158, 64%, 30%)", "hsl(217, 91%, 60%)", "hsl(43, 74%, 66%)", "hsl(0, 84%, 60%)", "hsl(280, 65%, 60%)"];

function buildMonthlyData(orders: { createdAt: string; total: number }[], apps: { createdAt: string }[], payments: { createdAt: string; status: string }[]) {
  const now = new Date();
  const months: { month: string; sales: number; orders: number; installments: number; payments: number }[] = [];
  for (let i = 8; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const mo = orders.filter(o => o.createdAt && `${new Date(o.createdAt).getFullYear()}-${new Date(o.createdAt).getMonth()}` === key);
    const ma = apps.filter(a => a.createdAt && `${new Date(a.createdAt).getFullYear()}-${new Date(a.createdAt).getMonth()}` === key);
    const mp = payments.filter(p => p.createdAt && p.status === "ناجح" && `${new Date(p.createdAt).getFullYear()}-${new Date(p.createdAt).getMonth()}` === key);
    months.push({
      month: MONTH_NAMES[d.getMonth()],
      sales: mo.reduce((s, o) => s + o.total, 0),
      orders: mo.length,
      installments: ma.length,
      payments: mp.length,
    });
  }
  return months;
}

function buildCityData(orders: { governorate?: string; city?: string }[]) {
  const counts = new Map<string, number>();
  for (const o of orders) {
    const c = o.governorate || o.city || "غير محدد";
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const arr = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (counts.size > 5) {
    const rest = Array.from(counts.entries()).slice(5).reduce((s, [, v]) => s + v, 0);
    arr.push(["أخرى", rest]);
  }
  return arr.map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
}

export default function AdminReportsPage() {
  const { users, employees, merchants, companies, products, orders, installmentApplications, payments, settlements, deliveries } = useApp();

  const totalSales = orders.reduce((s, o) => s + o.total, 0);
  const totalPayments = payments.filter(p => p.status === "ناجح").reduce((s, p) => s + p.amount, 0);

  const monthlyData = buildMonthlyData(orders, installmentApplications, payments);
  const cityData = buildCityData(orders);

  return (
    <DashboardLayout navItems={adminNavItems} title="التقارير" role="admin">
      <h1 className="text-2xl font-bold mb-6">التقارير والإحصائيات</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="المستخدمون" value={users.length} icon={Users} color="blue" />
        <StatCard label="التجار" value={merchants.length} icon={Store} color="green" />
        <StatCard label="الشركات" value={companies.length} icon={Building2} color="orange" />
        <StatCard label="الموظفون" value={employees.length} icon={Users} color="purple" />
        <StatCard label="المنتجات" value={products.length} icon={Package} color="blue" />
        <StatCard label="الطلبات" value={orders.length} icon={ShoppingBag} color="green" />
        <StatCard label="المبيعات" value={formatCurrency(totalSales)} icon={Wallet} color="orange" />
        <StatCard label="المدفوعات" value={formatCurrency(totalPayments)} icon={CreditCard} color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">تطور المبيعات</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area dataKey="sales" stroke="hsl(158, 64%, 30%)" fill="hsl(158, 64%, 30%)" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">الطلبات والتقسيط</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line dataKey="orders" stroke="hsl(217, 91%, 60%)" strokeWidth={2} />
                <Line dataKey="installments" stroke="hsl(158, 64%, 30%)" strokeWidth={2} />
                <Line dataKey="payments" stroke="hsl(43, 74%, 66%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">توزيع الطلبات حسب المدينة</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={cityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e: any) => e.name}>
                  {cityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">المقارنة الشهرية</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData.slice(-6)}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="installments" fill="hsl(158, 64%, 30%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="payments" fill="hsl(43, 74%, 66%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">ملخص العمليات</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>البيان</TableHead>
                <TableHead>العدد</TableHead>
                <TableHead>القيمة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow><TableCell>إجمالي الطلبات</TableCell><TableCell>{orders.length}</TableCell><TableCell>{formatCurrency(totalSales)}</TableCell></TableRow>
              <TableRow><TableCell>طلبات التقسيط</TableCell><TableCell>{installmentApplications.length}</TableCell><TableCell>{formatCurrency(installmentApplications.reduce((s,a) => s + a.deferredPrice, 0))}</TableCell></TableRow>
              <TableRow><TableCell>المدفوعات الناجحة</TableCell><TableCell>{payments.filter(p => p.status === "ناجح").length}</TableCell><TableCell>{formatCurrency(totalPayments)}</TableCell></TableRow>
              <TableRow><TableCell>التسويات</TableCell><TableCell>{settlements.length}</TableCell><TableCell>{formatCurrency(settlements.reduce((s,st) => s + st.merchantAmount, 0))}</TableCell></TableRow>
              <TableRow><TableCell>عمليات التوصيل</TableCell><TableCell>{deliveries.length}</TableCell><TableCell>—</TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
