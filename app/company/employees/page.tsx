"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { GOVERNORATES, EMPLOYEE_STATUSES } from "@/lib/constants";
import { Home, Users, CreditCard, Settings, Plus, Pencil, UserCheck, UserX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Employee, EmployeeStatus } from "@/lib/types";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/company", label: "الرئيسية", icon: Home },
  { href: "/company/employees", label: "الموظفون", icon: Users },
  { href: "/company/installments", label: "عمليات التقسيط", icon: CreditCard },
  { href: "/company/settings", label: "الإعدادات", icon: Settings },
];

export default function CompanyEmployeesPage() {
  const { currentUser, companies, employees, addEmployee, updateEmployee } = useApp();
  const company = companies.find(c => c.userId === currentUser?.id);
  const myEmployees = employees.filter(e => e.companyId === company?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "", employeeNumber: "", phone: "", email: "", jobTitle: "", salary: "200000", city: company?.city || "أمانة العاصمة", status: "نشط" as EmployeeStatus,
  });

  const resetForm = () => {
    setFormData({ name: "", employeeNumber: "", phone: "", email: "", jobTitle: "", salary: "200000", city: company?.city || "أمانة العاصمة", status: "نشط" });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.employeeNumber) { toast.error("البيانات غير مكتملة"); return; }
    const empData = {
      userId: "",
      name: formData.name,
      employeeNumber: formData.employeeNumber,
      phone: formData.phone,
      email: formData.email,
      companyId: company!.id,
      jobTitle: formData.jobTitle,
      salary: Number(formData.salary),
      hireDate: new Date().toISOString(),
      status: formData.status as EmployeeStatus,
      eligibility: "قيد المراجعة" as const,
      installmentLimit: Math.round(Number(formData.salary) * 2),
      usedLimit: 0,
      city: formData.city,
    };
    if (editingId) {
      updateEmployee(editingId, empData);
      toast.success("تم تحديث بيانات الموظف");
    } else {
      addEmployee(empData);
      toast.success("تم إضافة الموظف بنجاح");
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setFormData({ name: emp.name, employeeNumber: emp.employeeNumber, phone: emp.phone, email: emp.email, jobTitle: emp.jobTitle, salary: String(emp.salary), city: emp.city, status: emp.status });
    setDialogOpen(true);
  };

  const toggleStatus = (emp: Employee) => {
    const newStatus: EmployeeStatus = emp.status === "نشط" ? "متوقف" : "نشط";
    updateEmployee(emp.id, { status: newStatus });
    toast.success(`تم ${newStatus === "نشط" ? "تفعيل" : "إيقاف"} الموظف`);
  };

  return (
    <DashboardLayout navItems={navItems} title="الموظفون" role="company">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">الموظفون ({myEmployees.length})</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" /> إضافة موظف</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "تعديل موظف" : "إضافة موظف جديد"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label className="mb-1.5 block">الاسم الكامل *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                <div><Label className="mb-1.5 block">رقم الموظف *</Label><Input value={formData.employeeNumber} onChange={e => setFormData({ ...formData, employeeNumber: e.target.value })} required /></div>
                <div><Label className="mb-1.5 block">رقم الهاتف</Label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} dir="ltr" /></div>
                <div><Label className="mb-1.5 block">البريد الإلكتروني</Label><Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} dir="ltr" /></div>
                <div><Label className="mb-1.5 block">الوظيفة</Label><Input value={formData.jobTitle} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })} /></div>
                <div><Label className="mb-1.5 block">الراتب (ر.ي)</Label><Input type="number" value={formData.salary} onChange={e => setFormData({ ...formData, salary: e.target.value })} /></div>
                <div><Label className="mb-1.5 block">المدينة</Label><Select value={formData.city} onValueChange={v => setFormData({ ...formData, city: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="mb-1.5 block">الحالة</Label><Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v as EmployeeStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EMPLOYEE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">إلغاء</Button></DialogClose><Button type="submit">{editingId ? "تحديث" : "إضافة"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {myEmployees.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد موظفون" description="ابدأ بإضافة موظفي شركتك" actionLabel="إضافة موظف" actionHref="#" />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>رقم الموظف</TableHead>
                  <TableHead>الوظيفة</TableHead>
                  <TableHead>الراتب</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الأهلية</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myEmployees.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell className="text-sm font-medium">{emp.name}</TableCell>
                    <TableCell className="text-sm">{emp.employeeNumber}</TableCell>
                    <TableCell className="text-sm">{emp.jobTitle}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(emp.salary)}</TableCell>
                    <TableCell><StatusBadge status={emp.status} /></TableCell>
                    <TableCell><StatusBadge status={emp.eligibility} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(emp)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(emp)}>
                          {emp.status === "نشط" ? <UserX className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4 text-green-600" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
