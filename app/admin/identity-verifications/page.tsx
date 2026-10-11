"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "@/components/ui/dialog";
import { useApp } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/constants";
import type { IdentityVerification } from "@/lib/types";
import { ShieldCheck, CheckCircle2, XCircle, RefreshCw, Eye, IdCard, Clock, AlertTriangle, ScrollText } from "lucide-react";
import { toast } from "sonner";

export default function AdminIdentityVerificationsPage() {
  const { identityVerifications, reviewIdentityVerification, logIdentityAccess, auditLogs } = useApp();
  const [selectedVerif, setSelectedVerif] = useState<IdentityVerification | null>(null);

  const pending = identityVerifications.filter(v => v.status === "بانتظار المراجعة");
  const reviewed = identityVerifications.filter(v => v.status !== "بانتظار المراجعة");

  const handleViewVerification = (v: IdentityVerification) => {
    logIdentityAccess(v.id, v.userName);
    setSelectedVerif(v);
  };

  const handleApprove = (id: string) => {
    reviewIdentityVerification(id, "تم التحقق", "تم التحقق من الهوية بنجاح");
    toast.success("تم قبول التحقق من الهوية");
  };

  const handleReject = (id: string) => {
    reviewIdentityVerification(id, "تعذر التحقق", "لم يمكن التحقق من الوثيقة");
    toast.success("تم رفض التحقق");
  };

  const handleResubmit = (id: string) => {
    reviewIdentityVerification(id, "طلب إعادة الرفع", "يرجى إعادة رفع صور أوضح للوثيقة والسيلفي");
    toast.success("تم طلب إعادة رفع الوثائق");
  };

  return (
    <DashboardLayout navItems={adminNavItems} title="التحقق من الهوية" role="admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">التحقق من الهوية</h1>
        <p className="text-muted-foreground text-sm mt-1">
          مراجعة طلبات التحقق من هوية المستخدمين
        </p>
      </div>

      <Alert className="mb-6 border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-xs text-amber-800">
          صور الهوية والسيلفي بيانات شخصية حساسة ومتاحة فقط للجهات المخولة بالمراجعة. التحقق من الهوية خطوة منفصلة عن تقييم الأهلية المالية ولا يستخدم لاتخاذ قرار تمويلي تلقائي.
        </AlertDescription>
      </Alert>

      {/* Pending reviews */}
      <div className="mb-6">
        <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          بانتظار المراجعة ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="لا توجد طلبات بانتظار المراجعة" description="جميع الطلبات تمت مراجعتها" />
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المستخدم</TableHead>
                    <TableHead>نوع الحساب</TableHead>
                    <TableHead>نوع الوثيقة</TableHead>
                    <TableHead>تاريخ الإرسال</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium text-sm">{v.userName}</TableCell>
                      <TableCell className="text-sm">{ROLE_LABELS[v.userRole]}</TableCell>
                      <TableCell className="text-sm">{v.documentType}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(v.submittedAt).toLocaleDateString("ar-YE")}
                      </TableCell>
                      <TableCell><StatusBadge status={v.status} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={() => handleApprove(v.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            قبول
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-orange-600" onClick={() => handleResubmit(v.id)}>
                            <RefreshCw className="h-3.5 w-3.5" />
                            إعادة رفع
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-red-600" onClick={() => handleReject(v.id)}>
                            <XCircle className="h-3.5 w-3.5" />
                            رفض
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1" onClick={() => handleViewVerification(v)}>
                            <Eye className="h-3.5 w-3.5" />
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
      </div>

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <div>
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            تمت المراجعة ({reviewed.length})
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المستخدم</TableHead>
                    <TableHead>نوع الحساب</TableHead>
                    <TableHead>نوع الوثيقة</TableHead>
                    <TableHead>تاريخ الإرسال</TableHead>
                    <TableHead>تاريخ المراجعة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>ملاحظات</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewed.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium text-sm">{v.userName}</TableCell>
                      <TableCell className="text-sm">{ROLE_LABELS[v.userRole]}</TableCell>
                      <TableCell className="text-sm">{v.documentType}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(v.submittedAt).toLocaleDateString("ar-YE")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {v.reviewedAt ? new Date(v.reviewedAt).toLocaleDateString("ar-YE") : "—"}
                      </TableCell>
                      <TableCell><StatusBadge status={v.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-40 truncate">
                        {v.reviewerNotes || "—"}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="gap-1" onClick={() => handleViewVerification(v)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedVerif} onOpenChange={(open) => !open && setSelectedVerif(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IdCard className="h-5 w-5 text-primary" />
              تفاصيل التحقق من الهوية
            </DialogTitle>
            <DialogDescription>
              مراجعة بيانات {selectedVerif?.userName}
            </DialogDescription>
          </DialogHeader>

          {selectedVerif && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">الاسم:</span> <span className="font-medium">{selectedVerif.userName}</span></div>
                <div><span className="text-muted-foreground">البريد:</span> <span className="font-medium" dir="ltr">{selectedVerif.userEmail}</span></div>
                <div><span className="text-muted-foreground">نوع الحساب:</span> <span className="font-medium">{ROLE_LABELS[selectedVerif.userRole]}</span></div>
                <div><span className="text-muted-foreground">نوع الوثيقة:</span> <span className="font-medium">{selectedVerif.documentType}</span></div>
                <div><span className="text-muted-foreground">تاريخ الإرسال:</span> <span className="font-medium">{new Date(selectedVerif.submittedAt).toLocaleDateString("ar-YE")}</span></div>
                <div><span className="text-muted-foreground">الحالة:</span> <StatusBadge status={selectedVerif.status} /></div>
              </div>

              {selectedVerif.documentImage ? (
                <div>
                  <p className="text-sm font-medium mb-2">صورة الوثيقة:</p>
                  <img src={selectedVerif.documentImage} alt="الوثيقة" className="w-full max-h-64 object-contain rounded-lg border" />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  لا توجد صورة للوثيقة (بيانات تجريبية)
                </div>
              )}

              {selectedVerif.selfieImage ? (
                <div>
                  <p className="text-sm font-medium mb-2">صورة السيلفي:</p>
                  <img src={selectedVerif.selfieImage} alt="السيلفي" className="w-full max-h-64 object-contain rounded-lg border" />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  لا توجد صورة سيلفي (بيانات تجريبية)
                </div>
              )}

              {selectedVerif.reviewerNotes && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">ملاحظات المراجع:</p>
                  <p className="text-sm">{selectedVerif.reviewerNotes}</p>
                </div>
              )}

              {/* Access History */}
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium mb-2 flex items-center gap-1">
                  <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
                  سجل الوصول إلى بيانات الهوية
                </p>
                {(() => {
                  const accessLogs = auditLogs.filter(
                    l => l.entity === "IdentityVerification" && l.entityId === selectedVerif.id
                  );
                  if (accessLogs.length === 0) {
                    return <p className="text-xs text-muted-foreground">لا يوجد سجل وصول سابق</p>;
                  }
                  return (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {accessLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground shrink-0">
                            {new Date(log.timestamp).toLocaleString("ar-YE")}
                          </span>
                          <span className="text-muted-foreground">—</span>
                          <span className="font-medium">{log.actor}</span>
                          <span className="text-muted-foreground">{log.action}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-800">
                  هذه البيانات حساسة ومتاحة فقط للجهات المخولة بالمراجعة. التحقق من الهوية لا يعني الموافقة على طلب التقسيط.
                </AlertDescription>
              </Alert>

              {selectedVerif.status === "بانتظار المراجعة" && (
                <div className="flex gap-2">
                  <Button className="flex-1 gap-1 text-green-600" variant="outline" onClick={() => { handleApprove(selectedVerif.id); setSelectedVerif(null); }}>
                    <CheckCircle2 className="h-4 w-4" />
                    قبول
                  </Button>
                  <Button className="flex-1 gap-1 text-orange-600" variant="outline" onClick={() => { handleResubmit(selectedVerif.id); setSelectedVerif(null); }}>
                    <RefreshCw className="h-4 w-4" />
                    إعادة رفع
                  </Button>
                  <Button className="flex-1 gap-1 text-red-600" variant="outline" onClick={() => { handleReject(selectedVerif.id); setSelectedVerif(null); }}>
                    <XCircle className="h-4 w-4" />
                    رفض
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
