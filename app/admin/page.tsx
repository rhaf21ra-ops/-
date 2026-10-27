"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PremiumStatCard } from "@/components/premium-stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { Home, Users, Store, Building2, Package, ShoppingBag, CreditCard, Wallet, Receipt, BarChart3, Settings, FileText, ScrollText, Truck, TrendingUp, ShieldCheck, Zap, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import type { Currency } from "@/lib/currency";

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
const PIE_COLORS = ["#047857", "#2563eb", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

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

export default function AdminDashboardPremium() {
  const { users, employees, merchants, companies, products, orders, installmentApplications, installmentContracts, payments, settlements, toYER, currentUser } = useApp();

  const totalSales = orders.reduce((s, o) => s + toYER(o.total, o.currency), 0);
  const totalPayments = payments.filter(p => p.status === "ناجح").reduce((s, p) => s + toYER(p.amount, p.currency), 0);
  const activeInstallments = installmentContracts.filter(c => c.status === "نشط").length;
  const pendingMerchants = merchants.filter(m => m.status === "قيد المراجعة").length;
  const lowStock = products.filter(p => p.stock < 5).length;

  const monthlyData = buildMonthlyData(orders, toYER);
  const categoryData = buildCategoryData(products);
  const revenueGrowth = monthlyData.length >= 2 ? ((monthlyData[monthlyData.length-1].sales - monthlyData[monthlyData.length-2].sales) / Math.max(1, monthlyData[monthlyData.length-2].sales) * 100).toFixed(1) : "0";

  return (
    <DashboardLayout navItems={navItems} title="لوحة الإدارة" role="admin">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-6 md:p-8 mb-6">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute -top-24 -left-24 h-64 w-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -right-16 h-48 w-48 bg-yellow-400/20 rounded-full blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-emerald-200" />
              <span className="text-sm font-medium text-emerald-100">مرحباً {currentUser?.name || "المالك"} • alwan7988@gmail.com</span>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">مالك المنصة</Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold">لوحة تحكم قسطها — إصدار المليون دولار</h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-2xl">نظرة شاملة لحظية: كل سلة مفصولة لكل مستخدم، عملات ثلاث، فواتير QR، تقسيط ذكي. قاعدة البيانات جاهزة للانطلاق.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 text-center border border-white/20">
              <p className="text-xs text-emerald-100">نسبة النمو</p>
              <p className="text-xl font-bold flex items-center gap-1 justify-center"><TrendingUp className="h-4 w-4"/> {revenueGrowth}%</p>
            </div>
            <div className="bg-white text-emerald-700 rounded-xl px-4 py-3 text-center font-bold shadow-lg">
              <p className="text-xs text-muted-foreground">الحالة</p>
              <p className="text-sm flex items-center gap-1"><Zap className="h-4 w-4 text-amber-500"/> جاهز للإطلاق</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(pendingMerchants > 0 || lowStock > 0) && (
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          {pendingMerchants > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm font-medium">لديك {pendingMerchants} تجار بانتظار التفعيل → راجع /admin/merchants</p>
            </div>
          )}
          {lowStock > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-900">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm font-medium">{lowStock} منتجات مخزونها أقل من 5 → /admin/products</p>
            </div>
          )}
        </div>
      )}

      {/* Premium Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PremiumStatCard label="إجمالي المبيعات" value={formatCurrency(totalSales)} icon={Wallet} gradient="bg-gradient-to-r from-emerald-500 to-teal-600" iconBg="bg-gradient-to-br from-emerald-500 to-teal-600" trend={`${revenueGrowth}% هذا الشهر`} trendUp={Number(revenueGrowth) >= 0} />
        <PremiumStatCard label="الطلبات" value={orders.length} icon={ShoppingBag} gradient="bg-gradient-to-r from-blue-500 to-indigo-600" iconBg="bg-gradient-to-br from-blue-500 to-indigo-600" trend={`${monthlyData[monthlyData.length-1]?.orders || 0} هذا الشهر`} trendUp />
        <PremiumStatCard label="عقود التقسيط النشطة" value={activeInstallments} icon={CreditCard} gradient="bg-gradient-to-r from-violet-500 to-purple-600" iconBg="bg-gradient-to-br from-violet-500 to-purple-600" trend={`${installmentApplications.length} طلبات`} trendUp />
        <PremiumStatCard label="التجار النشطون" value={merchants.filter(m=>m.status==="نشط").length} icon={Store} gradient="bg-gradient-to-r from-amber-500 to-orange-600" iconBg="bg-gradient-to-br from-amber-500 to-orange-600" trend={`${pendingMerchants} قيد المراجعة`} trendUp={false} />
        <PremiumStatCard label="المستخدمون" value={users.length} icon={Users} gradient="bg-gradient-to-r from-slate-600 to-slate-800" iconBg="bg-gradient-to-br from-slate-700 to-slate-900" trend={`${employees.length} موظف`} trendUp />
        <PremiumStatCard label="المنتجات" value={products.length} icon={Package} gradient="bg-gradient-to-r from-cyan-500 to-blue-600" iconBg="bg-gradient-to-br from-cyan-500 to-blue-600" trend={`${products.filter(p=>p.visible).length} متاح`} trendUp />
        <PremiumStatCard label="المدفوعات الناجحة" value={formatCurrency(totalPayments)} icon={Receipt} gradient="bg-gradient-to-r from-emerald-600 to-green-700" iconBg="bg-gradient-to-br from-emerald-600 to-green-700" trend={`${payments.length} عملية`} trendUp />
        <PremiumStatCard label="الشركات" value={companies.length} icon={Building2} gradient="bg-gradient-to-r from-rose-500 to-pink-600" iconBg="bg-gradient-to-br from-rose-500 to-pink-600" trend={`${companies.filter(c=>c.status==="نشط").length} نشط`} trendUp />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-emerald-600"/> المبيعات الشهرية (بالريال اليمني)</CardTitle>
            <CardDescription>تحويل تلقائي من SAR/USD حسب أسعار الصرف</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <defs><linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#047857" stopOpacity={0.3}/><stop offset="95%" stopColor="#047857" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12 }} />
                <Area type="monotone" dataKey="sales" stroke="#047857" strokeWidth={3} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle className="text-lg">الطلبات الشهرية</CardTitle><CardDescription>عدد الطلبات مع تقسيم نقدي/تقسيط</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="orders" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader><CardTitle className="text-lg">توزيع المنتجات حسب التصنيف</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={105} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                  {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">أحدث الطلبات <Badge variant="outline">{orders.length} إجمالي</Badge></CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead className="text-xs">الطلب</TableHead><TableHead className="text-xs">العميل</TableHead><TableHead className="text-xs">المبلغ</TableHead><TableHead className="text-xs">الحالة</TableHead></TableRow></TableHeader>
              <TableBody>
                {orders.slice(0, 7).map(o => (
                  <TableRow key={o.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-mono font-medium">{o.orderNumber}</TableCell>
                    <TableCell className="text-xs">{o.customerName}</TableCell>
                    <TableCell className="text-xs font-bold">{formatCurrency(o.total, o.currency)}</TableCell>
                    <TableCell><Badge variant={(o.status as string)==="مكتمل"||(o.status as string)==="تم التوصيل" ? "default" : o.status==="قيد المراجعة" ? "secondary":"outline"} className="text-[10px]">{o.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {orders.length===0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">لا توجد طلبات بعد — ابدأ بإضافة منتجات وتجربة الطلب</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Premium Footer Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600"/> أمان بمستوى بنكي</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">كل سلة معزولة بـ user_id + RLS (own_cart). الدفع يُحسب في الخادم place_order. service_role لا يصل للمتصفح.</CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-600"/> جاهز للتوسع</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">3 عملات مع تحويل لحظي، فواتير PDF + QR، 156 فرع، Netlify + Supabase مجاناً للانطلاق.</CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-amber-600"/> PWA للموبايل</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">يثبت على الشاشة، يعمل أوفلاين، إشعارات، سريع كالبرق — تجربة مليون دولار.</CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
