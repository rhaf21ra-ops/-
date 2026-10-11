"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/constants";
import { Search, ScrollText } from "lucide-react";
import { useState } from "react";

export default function AdminAuditLogsPage() {
  const { auditLogs } = useApp();
  const [search, setSearch] = useState("");

  const filtered = auditLogs.filter(log => {
    if (!search) return true;
    return log.actor.includes(search) || log.action.includes(search) || log.details.includes(search);
  });

  return (
    <DashboardLayout navItems={adminNavItems} title="سجل العمليات" role="admin">
      <h1 className="text-2xl font-bold mb-6">سجل العمليات (Audit Logs)</h1>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="ابحث في السجل..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ScrollText} title="لا توجد سجلات" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>القائم بالعملية</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>العملية</TableHead>
                  <TableHead>البيانات المتأثرة</TableHead>
                  <TableHead>التفاصيل</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-sm">{log.actor}</TableCell>
                    <TableCell className="text-sm">{ROLE_LABELS[log.actorRole]}</TableCell>
                    <TableCell className="text-sm">{log.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.entity}</TableCell>
                    <TableCell className="text-sm">{log.details}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleDateString("ar-YE")} {new Date(log.timestamp).toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })}</TableCell>
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
