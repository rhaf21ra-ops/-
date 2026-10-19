"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { useToast } from "@/hooks/use-toast";
import { Home, ShoppingBag, CreditCard, Wallet, Bell, User, ArrowRight, CalendarClock, Receipt, CheckCircle2, PackagePlus, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/employee", label: "الرئيسية", icon: Home },
  { href: "/employee/orders", label: "طلباتي", icon: ShoppingBag },
  { href: "/employee/installments", label: "التقسيط", icon: CreditCard },
  { href: "/employee/payments", label: "المدفوعات", icon: Wallet },
  { href: "/request-product", label: "طلب منتج غير مدرج", icon: PackagePlus },
  { href: "/requests", label: "طلباتي الخاصة", icon: ClipboardList },
  { href: "/employee/notifications", label: "الإشعارات", icon: Bell },
  { href: "/employee/profile", label: "الملف الشخصي", icon: User },
];

const PAYMENT_METHODS = [
  "خصم من الراتب",
  "تحويل بنكي",
  "نقداً",
  "محفظة إلكترونية",
];

export default function InstallmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { installmentContracts, installmentApplications, recordPayment, isReal } =
    useApp();
  const { toast } = useToast();

  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);

  const contract = installmentContracts.find((c) => c.id === params.id);
  const application = installmentApplications.find(
    (a) => a.id === contract?.applicationId
  );

  if (!contract) {
    return (
      <DashboardLayout navItems={navItems} title="لوحة الموظف" role="employee">
        <EmptyState
          icon={Receipt}
          title="عقد التقسيط غير موجود"
          description="لم نتمكن من العثور على هذا العقد"
          action={
            <Link href="/employee/installments">
              <Button size="sm" className="gap-1">
                <ArrowRight className="h-4 w-4" />
                العودة لقائمة العقود
              </Button>
            </Link>
          }
        />
      </DashboardLayout>
    );
  }

  const progress = Math.round(
    (contract.paidAmount / contract.totalAmount) * 100
  );

  const nextDuePayment = contract.payments.find(
    (p) => p.status !== "مدفوع"
  );

  const isCompleted = contract.status === "مكتمل";

  const handlePay = () => {
    if (!nextDuePayment) return;
    recordPayment(
      contract.id,
      nextDuePayment.amount,
      method,
      nextDuePayment.number
    );
    toast({
      title: "تم تسجيل الدفعة بنجاح",
      description: `تم دفع القسط رقم ${nextDuePayment.number} بقيمة ${formatCurrency(
        nextDuePayment.amount
      )}`,
    });
    setPayOpen(false);
  };

  return (
    <DashboardLayout navItems={navItems} title="لوحة الموظف" role="employee">
      {/* Back link */}
      <Link
        href="/employee/installments"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowRight className="h-4 w-4" />
        العودة لقائمة العقود
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{contract.contractNumber}</h1>
          <StatusBadge status={contract.status} />
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          {contract.productName}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">إجمالي المبلغ</p>
            </div>
            <p className="text-lg font-bold">
              {formatCurrency(contract.totalAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">القسط الشهري</p>
            </div>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(contract.monthlyInstallment)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">المدفوع</p>
            </div>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(contract.paidAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">المتبقي</p>
            </div>
            <p className="text-lg font-bold text-orange-600">
              {formatCurrency(contract.remainingAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress + pay action */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">تقدّم السداد</span>
            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {contract.paidInstallments} من {contract.durationMonths} قسط مدفوع
          </p>

          {nextDuePayment && !isCompleted && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-medium">
                  القسط القادم المستحق رقم {nextDuePayment.number}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  المبلغ: {formatCurrency(nextDuePayment.amount)} · استحقاق{" "}
                  {new Date(nextDuePayment.dueDate).toLocaleDateString("ar-YE")}
                </p>
              </div>
              {isReal ? (
                <p className="max-w-xs text-xs text-muted-foreground">يسجّل فريق المنصة السداد بعد استقطاعه من راتبك أو دفعه في الفرع، وسيظهر هنا فور تسجيله.</p>
              ) : (
              <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <CreditCard className="h-4 w-4" />
                    دفع القسط القادم
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>دفع القسط رقم {nextDuePayment.number}</DialogTitle>
                    <DialogDescription>
                      قم بتأكيد دفع القسط المستحق بقيمة{" "}
                      {formatCurrency(nextDuePayment.amount)}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div>
                      <Label className="mb-1.5 block">طريقة الدفع</Label>
                      <Select value={method} onValueChange={setMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">رقم العقد</span>
                        <span className="font-medium">
                          {contract.contractNumber}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-muted-foreground">المبلغ</span>
                        <span className="font-bold">
                          {formatCurrency(nextDuePayment.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <DialogClose asChild>
                      <Button variant="outline">إلغاء</Button>
                    </DialogClose>
                    <Button onClick={handlePay} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      تأكيد الدفع
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              )}
            </div>
          )}

          {isCompleted && (
            <div className="mt-4 rounded-lg border bg-green-50 p-4 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              تم سداد كامل قيمة العقد بنجاح
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract info */}
      {application && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">معلومات العقد</CardTitle>
            <CardDescription>تفاصيل طلب التقسيط المرتبط</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <InfoItem label="رقم الطلب" value={application.applicationNumber} />
              <InfoItem label="المنتج" value={application.productName} />
              <InfoItem label="التاجر" value={application.merchantName} />
              <InfoItem label="المدة" value={`${application.durationMonths} شهر`} />
              <InfoItem
                label="السعر النقدي"
                value={formatCurrency(application.cashPrice)}
              />
              <InfoItem
                label="السعر المؤجل"
                value={formatCurrency(application.deferredPrice)}
              />
              <InfoItem
                label="تاريخ بدء العقد"
                value={new Date(contract.startDate).toLocaleDateString("ar-YE")}
              />
              <InfoItem
                label="أول استحقاق"
                value={new Date(contract.firstDueDate).toLocaleDateString(
                  "ar-YE"
                )}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">جدول الأقساط</CardTitle>
          <CardDescription>
            جدول سداد جميع الأقساط وحالة كل قسط
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم القسط</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>تاريخ الاستحقاق</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الدفع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contract.payments.map((p) => (
                <TableRow key={p.number}>
                  <TableCell className="font-medium text-sm">
                    القسط {p.number}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatCurrency(p.amount)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(p.dueDate).toLocaleDateString("ar-YE")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.paidAt
                      ? new Date(p.paidAt).toLocaleDateString("ar-YE")
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator className="my-6" />
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.push("/employee/payments")}>
          سجل المدفوعات
        </Button>
        <Link href="/employee/installments">
          <Button variant="ghost">كل العقود</Button>
        </Link>
      </div>
    </DashboardLayout>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium text-sm">{value}</span>
    </div>
  );
}
