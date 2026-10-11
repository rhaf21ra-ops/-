"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { Home, Users, CreditCard, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/company", label: "الرئيسية", icon: Home },
  { href: "/company/employees", label: "الموظفون", icon: Users },
  { href: "/company/installments", label: "عمليات التقسيط", icon: CreditCard },
  { href: "/company/settings", label: "الإعدادات", icon: Settings },
];

export default function CompanySettingsPage() {
  const { currentUser, companies } = useApp();
  const company = companies.find(c => c.userId === currentUser?.id);

  return (
    <DashboardLayout navItems={navItems} title="الإعدادات" role="company">
      <h1 className="text-2xl font-bold mb-6">إعدادات الشركة</h1>

      {company && (
        <Card className="max-w-2xl">
          <CardHeader><CardTitle className="text-lg">معلومات الشركة</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label className="mb-1.5 block">اسم الشركة</Label><Input defaultValue={company.name} /></div>
            <div><Label className="mb-1.5 block">اسم المسؤول</Label><Input defaultValue={company.contactName} /></div>
            <div><Label className="mb-1.5 block">رقم الهاتف</Label><Input defaultValue={company.phone} dir="ltr" /></div>
            <div><Label className="mb-1.5 block">البريد الإلكتروني</Label><Input defaultValue={company.email} dir="ltr" /></div>
            <div><Label className="mb-1.5 block">عدد الموظفين</Label><Input type="number" defaultValue={company.employeeCount} /></div>
            <div><Label className="mb-1.5 block">المدينة</Label><Input defaultValue={company.city} /></div>
            <Button onClick={() => toast.success("تم حفظ الإعدادات")}>حفظ التغييرات</Button>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
