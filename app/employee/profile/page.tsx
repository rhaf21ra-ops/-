"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { useToast } from "@/hooks/use-toast";
import { Home, ShoppingBag, CreditCard, Wallet, Bell, User, Mail, Phone, Building2, Briefcase, Banknote, MapPin, CalendarDays, IdCard, Pencil, Receipt, PackagePlus, ClipboardList, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/employee", label: "الرئيسية", icon: Home },
  { href: "/employee/orders", label: "طلباتي", icon: ShoppingBag },
  { href: "/employee/installments", label: "التقسيط", icon: CreditCard },
  { href: "/employee/payments", label: "المدفوعات", icon: Wallet },
  { href: "/request-product", label: "طلب منتج غير مدرج", icon: PackagePlus },
  { href: "/requests", label: "طلباتي الخاصة", icon: ClipboardList },
  { href: "/invoices", label: "فواتيري", icon: FileText },
  { href: "/employee/notifications", label: "الإشعارات", icon: Bell },
  { href: "/employee/profile", label: "الملف الشخصي", icon: User },
];

export default function EmployeeProfilePage() {
  const { currentUser, employees, companies, updateEmployee } = useApp();
  const { toast } = useToast();

  const employee = employees.find((e) => e.userId === currentUser?.id);
  const company = companies.find((c) => c.id === employee?.companyId);

  const [phone, setPhone] = useState(employee?.phone || "");
  const [editOpen, setEditOpen] = useState(false);

  if (!employee) {
    return (
      <DashboardLayout navItems={navItems} title="لوحة الموظف" role="employee">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            لم يتم العثور على بيانات الموظف
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const remainingLimit = employee.installmentLimit - employee.usedLimit;
  const usedPercent = Math.round(
    (employee.usedLimit / employee.installmentLimit) * 100
  );

  const handleSavePhone = () => {
    if (!phone.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم هاتف صحيح",
        variant: "destructive",
      });
      return;
    }
    updateEmployee(employee.id, { phone: phone.trim() });
    toast({
      title: "تم تحديث الرقم",
      description: "تم حفظ رقم الهاتف بنجاح",
    });
    setEditOpen(false);
  };

  return (
    <DashboardLayout navItems={navItems} title="لوحة الموظف" role="employee">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">الملف الشخصي</h1>
        <p className="text-muted-foreground text-sm mt-1">
          بياناتك الشخصية والمالية
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile summary */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6 text-center">
            <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-primary text-primary-foreground text-3xl font-bold mb-3">
              {employee.name.charAt(0)}
            </div>
            <h2 className="font-bold text-lg">{employee.name}</h2>
            <p className="text-sm text-muted-foreground">{employee.jobTitle}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {employee.employeeNumber}
            </p>
            <div className="mt-4">
              <StatusBadge status={employee.eligibility} />
            </div>
            <Separator className="my-4" />
            <div className="flex items-center justify-center gap-2 text-sm">
              <StatusBadge status={employee.status} />
              <span className="text-xs text-muted-foreground">حالة الموظف</span>
            </div>
          </CardContent>
        </Card>

        {/* Personal info */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">المعلومات الشخصية</CardTitle>
              <CardDescription>بيانات التوظيف والتواصل</CardDescription>
            </div>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Pencil className="h-3.5 w-3.5" />
                  تعديل الهاتف
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>تعديل رقم الهاتف</DialogTitle>
                  <DialogDescription>
                    قم بتحديث رقم هاتفك المرتبط بالحساب
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div>
                    <Label className="mb-1.5 block">رقم الهاتف</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07XXXXXXXX"
                      dir="ltr"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button variant="outline">إلغاء</Button>
                  </DialogClose>
                  <Button onClick={handleSavePhone}>حفظ التغييرات</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <InfoRow icon={IdCard} label="الرقم الوظيفي" value={employee.employeeNumber} />
              <InfoRow icon={Mail} label="البريد الإلكتروني" value={employee.email} />
              <InfoRow icon={Phone} label="رقم الهاتف" value={employee.phone} />
              <InfoRow icon={Building2} label="الشركة" value={company?.name || "—"} />
              <InfoRow icon={Briefcase} label="المسمى الوظيفي" value={employee.jobTitle} />
              <InfoRow icon={Banknote} label="الراتب الشهري" value={formatCurrency(employee.salary)} />
              <InfoRow icon={MapPin} label="المدينة" value={employee.city} />
              <InfoRow
                icon={CalendarDays}
                label="تاريخ التوظيف"
                value={new Date(employee.hireDate).toLocaleDateString("ar-YE")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial info */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">المعلومات المالية</CardTitle>
            <CardDescription>
              حد التقسيط والاستخدام الحالي
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              <InfoRow
                icon={CreditCard}
                label="حد التقسيط المتاح"
                value={formatCurrency(employee.installmentLimit)}
              />
              <InfoRow
                icon={Wallet}
                label="المبلغ المستخدم"
                value={formatCurrency(employee.usedLimit)}
              />
              <InfoRow
                icon={Receipt}
                label="المبلغ المتبقي"
                value={formatCurrency(remainingLimit)}
              />
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  نسبة استخدام حد التقسيط
                </span>
                <span className="text-sm font-bold text-primary">
                  {usedPercent}%
                </span>
              </div>
              <Progress value={usedPercent} className="h-3" />
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>المستخدم: {formatCurrency(employee.usedLimit)}</span>
                <span>
                  المتبقي: {formatCurrency(remainingLimit)} من{" "}
                  {formatCurrency(employee.installmentLimit)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="font-medium text-sm">{value}</span>
    </div>
  );
}
