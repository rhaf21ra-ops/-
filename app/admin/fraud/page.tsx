"use client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
export default function FraudPage(){
  const [alerts,setAlerts]=useState<any[]>([]);
  useEffect(()=>{ supabase.from('fraud_alerts').select('*').order('created_at',{ascending:false}).then(r=>setAlerts(r.data||[])); },[]);
  return (
    <DashboardLayout navItems={adminNavItems} title="مكافحة الاحتيال" role="admin">
      <h1 className="text-2xl font-bold">نظام مكافحة الاحتيال</h1><p className="text-sm text-muted-foreground mb-6">اكتشاف حسابات متعددة، تكرار طلبات، استخدام كوبونات مشبوه</p>
      <Card><CardHeader><CardTitle>التنبيهات ({alerts.length})</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>النوع</TableHead><TableHead>الخطورة</TableHead><TableHead>الحالة</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader><TableBody>{alerts.map(a=><TableRow key={a.id}><TableCell>{a.type}</TableCell><TableCell><Badge variant={a.severity==='high'?'destructive':'secondary'}>{a.severity}</Badge></TableCell><TableCell>{a.status}</TableCell><TableCell className="text-xs">{new Date(a.created_at).toLocaleString('ar-YE')}</TableCell></TableRow>)}{alerts.length===0&&<TableRow><TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">لا توجد تنبيهات - النظام يراقب تلقائياً</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
    </DashboardLayout>
  );
}
