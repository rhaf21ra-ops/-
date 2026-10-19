"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/store";
import { Home, Package, ShoppingBag, Boxes, Wallet, Settings, FileText } from "lucide-react";
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

export default function MerchantSettingsPage() {
  const { currentUser, merchants } = useApp();
  const merchant = merchants.find(m => m.userId === currentUser?.id);

  return (
    <DashboardLayout navItems={navItems} title="الإعدادات" role="merchant">
      <h1 className="text-2xl font-bold mb-6">إعدادات المتجر</h1>

      {merchant && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">معلومات المتجر</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label className="mb-1.5 block">اسم المتجر</Label><Input defaultValue={merchant.storeName} /></div>
              <div><Label className="mb-1.5 block">اسم المسؤول</Label><Input defaultValue={merchant.ownerName} /></div>
              <div><Label className="mb-1.5 block">رقم الهاتف</Label><Input defaultValue={merchant.phone} dir="ltr" /></div>
              <div><Label className="mb-1.5 block">البريد الإلكتروني</Label><Input defaultValue={merchant.email} dir="ltr" /></div>
              <div><Label className="mb-1.5 block">العنوان</Label><Input defaultValue={merchant.address} /></div>
              <Button onClick={() => toast.success("تم حفظ الإعدادات")}>حفظ التغييرات</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">إحصائيات المتجر</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between p-3 rounded-lg bg-muted/30"><span className="text-sm text-muted-foreground">تاريخ الإنشاء</span><span className="text-sm font-medium">{new Date(merchant.createdAt).toLocaleDateString("ar-YE")}</span></div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/30"><span className="text-sm text-muted-foreground">المدينة</span><span className="text-sm font-medium">{merchant.city}</span></div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/30"><span className="text-sm text-muted-foreground">التقييم</span><span className="text-sm font-medium">{merchant.rating} ★</span></div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/30"><span className="text-sm text-muted-foreground">إجمالي المبيعات</span><span className="text-sm font-medium">{merchant.salesTotal.toLocaleString("ar-YE")} ر.ي</span></div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/30"><span className="text-sm text-muted-foreground">الحالة</span><span className="text-sm font-medium text-green-600">{merchant.status}</span></div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
