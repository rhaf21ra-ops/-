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

const monthlyData = [
  { month: "يناير", sales: 1200000, orders: 15, installments: 5, payments: 4 },
  { month: "فبراير", sales: 1800000, orders: 22, installments: 8, payments: 7 },
  { month: "مارس", sales: 2100000, orders: 28, installments: 10, payments: 9 },
  { month: "أبريل", sales: 2500000, orders: 30, installments: 12, payments: 11 },
  { month: "مايو", sales: 3200000, orders: 35, installments: 14, payments: 12 },
  { month: "يونيو", sales: 3800000, orders: 42, installments: 16, payments: 15 },
  { month: "يوليو", sales: 4500000, orders: 50, installments: 18, payments: 17 },
  { month: "أغسطس", sales: 5200000, orders: 58, installments: 20, payments: 19 },
  { month: "سبتمبر", sales: 6100000, orders: 65, installments: 22, payments: 20 },
];

const cityData = [
  { name: "أمانة العاصمة", value: 45, color: "hsl(158, 64%, 30%)" },
  { name: "عدن", value: 20, color: "hsl(217, 91%, 60%)" },
  { name: "تعز", value: 15, color: "hsl(43, 74%, 66%)" },
  { name: "الحديدة", value: 10, color: "hsl(0, 84%, 60%)" },
  { name: "أخرى", value: 10, color: "hsl(280, 65%, 60%)" },
];

export default function AdminReportsPage() {
  const { users, employees, merchants, companies, products, orders, installmentApplications, payments, settlements, deliveries } = useApp();

  const totalSales = orders.reduce((s, o) => s + o.total, 0);
  const totalPayments = payments.filter(p => p.status === "ناجح").reduce((s, p) => s + p.amount, 0);

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
