"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";

export default function AdminCompaniesPage() {
  const { companies, employees, installmentContracts, setCompanyStatus } = useApp();

  return (
    <DashboardLayout navItems={adminNavItems} title="الشركات" role="admin">
      <h1 className="text-2xl font-bold mb-6">إدارة الشركات</h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الشركة</TableHead>
                <TableHead>المسؤول</TableHead>
                <TableHead>عدد الموظفين</TableHead>
                <TableHead>المدينة</TableHead>
                <TableHead>العمليات</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map(c => {
                const empCount = employees.filter(e => e.companyId === c.id).length;
                const empIds = employees.filter(e => e.companyId === c.id).map(e => e.id);
                const opsCount = installmentContracts.filter(con => empIds.includes(con.employeeId)).length;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{c.name}</TableCell>
                    <TableCell className="text-sm">{c.contactName}</TableCell>
                    <TableCell className="text-sm">{empCount}</TableCell>
                    <TableCell className="text-sm">{c.city}</TableCell>
                    <TableCell className="text-sm">{opsCount}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.status !== "نشط" && <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setCompanyStatus(c.id, "نشط")}>تفعيل</Button>}
                        {c.status !== "موقوف" && <Button size="sm" variant="destructive" onClick={() => setCompanyStatus(c.id, "موقوف")}>إيقاف</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
