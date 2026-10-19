"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { CreditCard, Check, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function AdminInstallmentsPage() {
  const { installmentApplications, reviewInstallmentApplication, addAuditLog, currentUser, isReal } = useApp();
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = async (id: string) => {
    const ok = await Promise.resolve(reviewInstallmentApplication(id, true));
    if (ok === false) return;
    addAuditLog({
      actor: currentUser?.name || "مدير",
      actorRole: "admin",
      action: "وافق على طلب تقسيط",
      entity: "InstallmentApplication",
      entityId: id,
      details: `الموافقة على طلب تقسيط`,
    });
    if (!isReal) toast.success("تم قبول طلب التقسيط بنجاح");
    setReviewId(null);
  };

  const handleReject = async (id: string) => {
    if (isReal && rejectionReason.trim().length < 3) { toast.error("اكتب سبب الرفض"); return; }
    const ok = await Promise.resolve(reviewInstallmentApplication(id, false, rejectionReason));
    if (ok === false) return;
    addAuditLog({
      actor: currentUser?.name || "مدير",
      actorRole: "admin",
      action: "رفض طلب تقسيط",
      entity: "InstallmentApplication",
      entityId: id,
      details: `رفض طلب تقسيط${rejectionReason ? ` - ${rejectionReason}` : ""}`,
    });
    if (!isReal) toast.error("تم رفض طلب التقسيط");
    setReviewId(null);
    setRejectionReason("");
  };

  return (
    <DashboardLayout navItems={adminNavItems} title="التقسيط" role="admin">
      <h1 className="text-2xl font-bold mb-6">إدارة طلبات التقسيط</h1>

      {installmentApplications.length === 0 ? (
        <EmptyState icon={CreditCard} title="لا توجد طلبات تقسيط" />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>الموظف</TableHead>
                  <TableHead>الشركة</TableHead>
                  <TableHead>المنتج</TableHead>
                  <TableHead>التاجر</TableHead>
                  <TableHead>السعر النقدي</TableHead>
                  <TableHead>السعر المؤجل</TableHead>
                  <TableHead>المدة</TableHead>
                  <TableHead>القسط</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installmentApplications.map(app => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium text-sm">{app.applicationNumber}</TableCell>
                    <TableCell className="text-sm">{app.employeeName}</TableCell>
                    <TableCell className="text-sm">{app.companyName}</TableCell>
                    <TableCell className="text-sm line-clamp-1 max-w-28">{app.productName}</TableCell>
                    <TableCell className="text-sm">{app.merchantName}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(app.cashPrice, app.currency)}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(app.deferredPrice, app.currency)}</TableCell>
                    <TableCell className="text-sm">{app.durationMonths} شهر</TableCell>
                    <TableCell className="text-sm">{formatCurrency(app.monthlyInstallment, app.currency)}</TableCell>
                    <TableCell><StatusBadge status={app.status} /></TableCell>
                    <TableCell>
                      {(app.status === "جديد" || app.status === "قيد المراجعة") ? (
                        <Dialog open={reviewId === app.id} onOpenChange={(open) => { if (!open) setReviewId(null); }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setReviewId(app.id)}>
                              <Eye className="h-3 w-3 ml-1" /> مراجعة
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>مراجعة طلب التقسيط {app.applicationNumber}</DialogTitle></DialogHeader>
                            <div className="space-y-3 py-4">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-muted-foreground">الموظف:</span> {app.employeeName}</div>
                                <div><span className="text-muted-foreground">الشركة:</span> {app.companyName}</div>
                                <div><span className="text-muted-foreground">المنتج:</span> {app.productName}</div>
                                <div><span className="text-muted-foreground">التاجر:</span> {app.merchantName}</div>
                                <div><span className="text-muted-foreground">السعر النقدي:</span> {formatCurrency(app.cashPrice, app.currency)}</div>
                                <div><span className="text-muted-foreground">السعر المؤجل:</span> {formatCurrency(app.deferredPrice, app.currency)}</div>
                                <div><span className="text-muted-foreground">المدة:</span> {app.durationMonths} شهر</div>
                                <div><span className="text-muted-foreground">القسط الشهري:</span> {formatCurrency(app.monthlyInstallment, app.currency)}</div>
                              </div>
                              <div>
                                <Label className="mb-1.5 block">سبب الرفض (اختياري)</Label>
                                <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="سبب الرفض إذا كان مرفوضاً" rows={2} />
                              </div>
                            </div>
                            <DialogFooter className="gap-2">
                              <DialogClose asChild><Button variant="outline">إلغاء</Button></DialogClose>
                              <Button variant="destructive" onClick={() => handleReject(app.id)}>
                                <X className="h-4 w-4 ml-2" /> رفض
                              </Button>
                              <Button onClick={() => handleApprove(app.id)} className="bg-green-600 hover:bg-green-700">
                                <Check className="h-4 w-4 ml-2" /> قبول
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-xs text-muted-foreground">{app.reviewedBy ? `تمت المراجعة بواسطة ${app.reviewedBy}` : "—"}</span>
                      )}
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
