"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/constants";
import { Search } from "lucide-react";
import { useState } from "react";

export default function AdminUsersPage() {
  const { users } = useApp();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const filtered = users.filter(u => {
    if (search && !u.name.includes(search) && !u.email.includes(search)) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    return true;
  });

  return (
    <DashboardLayout navItems={adminNavItems} title="المستخدمون" role="admin">
      <h1 className="text-2xl font-bold mb-6">إدارة المستخدمين</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="ابحث بالاسم أو البريد..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="كل الأدوار" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="employee">موظف</SelectItem>
            <SelectItem value="merchant">تاجر</SelectItem>
            <SelectItem value="company">شركة</SelectItem>
            <SelectItem value="admin">مدير</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-sm">{u.name}</TableCell>
                  <TableCell className="text-sm" dir="ltr">{u.email}</TableCell>
                  <TableCell><StatusBadge status={ROLE_LABELS[u.role]} /></TableCell>
                  <TableCell className="text-sm" dir="ltr">{u.phone}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("ar-YE")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
