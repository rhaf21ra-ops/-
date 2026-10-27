"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase-client";
import { toast } from "sonner";

export default function AdminBranchesPage(){
  const [branches,setBranches]=useState<any[]>([]);
  const [edits,setEdits]=useState<Record<string,string>>({});
  const load=async()=>{
    const {data}=await supabase.from('branches').select('id,name,city,governorate,branch_email').order('name').limit(200);
    setBranches(data||[]);
  };
  useEffect(()=>{load();},[]);
  const save=async(id:string)=>{
    const email=edits[id]?.trim();
    if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('بريد غير صحيح');
    const {error}=await supabase.from('branches').update({branch_email: email || null}).eq('id',id);
    if(error) toast.error(error.message); else { toast.success('تم الحفظ'); load(); }
  };
  return (
    <DashboardLayout navItems={adminNavItems} title="الفروع وبريدها" role="admin">
      <h1 className="text-2xl font-bold">الفروع وبريدها</h1>
      <p className="text-sm text-muted-foreground mb-6">أنت فقط كمدير تضيف البريد لكل فرع — عند اختيار العميل لفرع يُرسل الطلب تلقائياً لهذا البريد (محفوظ تاريخياً مع الطلب)</p>
      <Card><CardHeader><CardTitle className="text-base">156 فرع — أضف البريد</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-auto">
          <Table><TableHeader><TableRow><TableHead>الفرع</TableHead><TableHead>المحافظة</TableHead><TableHead>البريد الحالي</TableHead><TableHead>إجراء</TableHead></TableRow></TableHeader>
            <TableBody>{branches.map(b=>(
              <TableRow key={b.id}><TableCell className="font-medium text-sm">{b.name}</TableCell><TableCell className="text-sm">{b.governorate} - {b.city}</TableCell>
                <TableCell><Input placeholder="branch@example.com" defaultValue={b.branch_email||''} onChange={e=>setEdits({...edits,[b.id]:e.target.value})} className="h-8 text-xs"/></TableCell>
                <TableCell><Button size="sm" onClick={()=>save(b.id)} className="bg-emerald-600">حفظ</Button> {b.branch_email && <Badge className="mr-2 bg-emerald-600">مفعل</Badge>}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
