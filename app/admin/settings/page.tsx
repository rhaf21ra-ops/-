"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ExchangeRatesCard } from "@/components/ExchangeRatesCard";
import { adminNavItems } from "@/lib/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/lib/store";
import { BRAND, INSTALLMENT_DURATIONS } from "@/lib/brand";
import { CATEGORIES, GOVERNORATES } from "@/lib/constants";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  return (
    <DashboardLayout navItems={adminNavItems} title="الإعدادات" role="admin">
      <h1 className="text-2xl font-bold mb-6">إعدادات المنصة</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <ExchangeRatesCard />
        <Card>
          <CardHeader><CardTitle className="text-lg">إعدادات الهوية</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label className="mb-1.5 block">اسم المنصة</Label><Input defaultValue={BRAND.name} /></div>
            <div><Label className="mb-1.5 block">الشعار النصي</Label><Input defaultValue={BRAND.tagline} /></div>
            <div><Label className="mb-1.5 block">العملة الأساسية</Label><Input defaultValue="ريال يمني (مع الريال السعودي والدولار)" disabled /></div>
            <Button onClick={() => toast.success("تم حفظ الإعدادات")}>حفظ</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">إعدادات التقسيط</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1.5 block">مدد التقسيط المتاحة</Label>
              <div className="flex flex-wrap gap-2">
                {INSTALLMENT_DURATIONS.map(d => (
                  <span key={d} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium">{d} شهراً</span>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">نسبة السعر المؤجل (%)</Label>
              <Input type="number" defaultValue={22} />
              <p className="text-xs text-muted-foreground mt-1">النسبة المضافة للسعر النقدي لحساب السعر المؤجل</p>
            </div>
            <div>
              <Label className="mb-1.5 block">رسوم التوصيل الافتراضية (ر.ي)</Label>
              <Input type="number" defaultValue={5000} />
            </div>
            <div>
              <Label className="mb-1.5 block">حد التقسيط الأدنى (ر.ي)</Label>
              <Input type="number" defaultValue={50000} />
              <p className="text-xs text-muted-foreground mt-1">أقل قيمة منتج متاح للتقسيط</p>
            </div>
            <div>
              <Label className="mb-1.5 block">نسبة استقطاع الراتب القصوى (%)</Label>
              <Input type="number" defaultValue={40} />
              <p className="text-xs text-muted-foreground mt-1">أقصى نسبة من الراتب يمكن استقطاعها للأقساط</p>
            </div>
            <Button onClick={() => toast.success("تم حفظ إعدادات التقسيط")}>حفظ</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">المدن والمحافظات</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1.5 block">المحافظات المتاحة ({GOVERNORATES.length})</Label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {GOVERNORATES.map(g => (
                  <span key={g} className="px-2 py-1 rounded bg-muted text-xs">{g}</span>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">التصنيفات ({CATEGORIES.length})</Label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {CATEGORIES.map(c => (
                  <span key={c} className="px-2 py-1 rounded bg-muted text-xs">{c}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">إعدادات النظام</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>السماح بتسجيل حسابات جديدة</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>السماح بفتح متاجر جديدة</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>تفعيل الإشعارات</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>إظهار منتجات التقسيط</Label>
              <Switch defaultChecked />
            </div>
            <Button onClick={() => toast.success("تم حفظ إعدادات النظام")}>حفظ</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
