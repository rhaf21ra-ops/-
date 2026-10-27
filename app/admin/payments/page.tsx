"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { Wallet, Plus, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function AdminPaymentsPage() {
  const { payments, installmentContracts, recordPayment, addAuditLog, currentUser, isReal, toYER } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("محفظة إلكترونية");

  const activeContracts = installmentContracts.filter(c => c.status === "نشط");
  const totalPaid = payments.filter(p => p.status === "ناجح").reduce((s, p) => s + toYER(p.amount, p.currency), 0);
  const totalPending = payments.filter(p => p.status === "قيد المعالجة").reduce((s, p) => s + toYER(p.amount, p.currency), 0);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const contract = installmentContracts.find(c => c.id === selectedContractId);
    if (!contract) { toast.error("اختر عقداً"); return; }
    const amt = Number(amount) || contract.monthlyInstallment;
    const nextInstallment = contract.payments.find(p => p.status !== "مدفوع");
    const ok = await Promise.resolve(recordPayment(selectedContractId, amt, method, nextInstallment?.number));
    if (ok === false) return;
    addAuditLog({
      actor: currentUser?.name || "مدير",
      actorRole: "admin",
      action: "تسجيل دفعة",
      entity: "Payment",
      entityId: selectedContractId,
      details: `تسجيل دفعة بقيمة ${formatCurrency(amt)} للعقد ${contract.contractNumber}`,
    });
    if (!isReal) toast.success("تم تسجيل الدفعة بنجاح");
    setDialogOpen(false);
    setSelectedContractId("");
    setAmount("");
  };

  return (
    <DashboardLayout navItems={adminNavItems} title="المدفوعات" role="admin">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">إدارة المدفوعات</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" /> تسجيل دفعة</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>تسجيل دفعة</DialogTitle></DialogHeader>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <Label className="mb-1.5 block">العقد *</Label>
                <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                  <SelectTrigger><SelectValue placeholder="اختر العقد" /></SelectTrigger>
                  <SelectContent>
                    {activeContracts.map(c => <SelectItem key={c.id} value={c.id}>{c.contractNumber} - {c.employeeName} - {c.productName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">المبلغ (اتركه فارغاً للقسط الشهري)</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ بالريال اليمني" />
              </div>
              <div>
                <Label className="mb-1.5 block">طريقة الدفع</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="محفظة إلكترونية">محفظة إلكترونية</SelectItem>
                    <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                    <SelectItem value="نقدي">نقدي</SelectItem>
                    <SelectItem value="خصم من الراتب">خصم من الراتب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">إلغاء</Button></DialogClose>
                <Button type="submit">تسجيل الدفعة</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard label="إجمالي المدفوع" value={formatCurrency(totalPaid)} icon={Wallet} color="green" />
        <StatCard label="قيد المعالجة" value={formatCurrency(totalPending)} icon={Wallet} color="orange" />
        <StatCard label="عدد المدفوعات" value={payments.length} icon={DollarSign} color="blue" />
      </div>

      {payments.length === 0 ? (
        <EmptyState icon={Wallet} title="لا توجد مدفوعات" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الدفعة</TableHead>
                  <TableHead>الموظف</TableHead>
                  <TableHead>العقد</TableHead>
                  <TableHead>القسط</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(p => {
                  const contract = installmentContracts.find(c => c.id === p.contractId);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.paymentNumber}</TableCell>
                      <TableCell className="text-sm">{p.employeeName}</TableCell>
                      <TableCell className="text-sm">{contract?.contractNumber || "—"}</TableCell>
                      <TableCell className="text-sm">{p.installmentNumber || "—"}</TableCell>
                      <TableCell className="text-sm font-bold">{formatCurrency(p.amount, p.currency)}</TableCell>
                      <TableCell className="text-sm">{p.method}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("ar-YE")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
