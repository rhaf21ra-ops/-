"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase-client";
import { toast } from "sonner";

export default function AdminCouponsPage(){
  const [list,setList]=useState<any[]>([]);
  const [form,setForm]=useState({code:'',type:'percent',value:10,min:0,active:true});
  const load=async()=>{ const {data}=await supabase.from('coupons_ext').select('*').order('created_at',{ascending:false}); setList(data||[]); };
  useEffect(()=>{load();},[]);
  const save=async()=>{
    if(!form.code) return toast.error('أدخل الكود');
    const {error}=await supabase.from('coupons_ext').insert({code:form.code.toUpperCase(),discount_type:form.type,discount_value:form.value,min_purchase:form.min,is_active:form.active});
    if(error) toast.error(error.message); else { toast.success('تم إنشاء الكوبون'); load(); setForm({code:'',type:'percent',value:10,min:0,active:true});}
  };
  const toggle=async(id:string,active:boolean)=>{ await supabase.from('coupons_ext').update({is_active:!active}).eq('id',id); load();};
  return (
    <DashboardLayout navItems={adminNavItems} title="الكوبونات" role="admin">
      <h1 className="text-2xl font-bold">نظام الكوبونات المتكامل</h1><p className="text-sm text-muted-foreground mb-6">كوبونات التاجر والإدارة مع تحديد التجار/المنتجات/المستخدمين والصلاحية</p>
      <Card className="mb-6"><CardHeader><CardTitle className="text-base">إنشاء كوبون جديد</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-4">
          <div><Label>كود الكوبون *</Label><Input value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="QASTAHA20"/></div>
          <div><Label>نوع الخصم</Label><Select value={form.type} onValueChange={v=>setForm({...form,type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="percent">نسبة %</SelectItem><SelectItem value="fixed">مبلغ ثابت</SelectItem></SelectContent></Select></div>
          <div><Label>قيمة الخصم</Label><Input type="number" value={form.value} onChange={e=>setForm({...form,value:+e.target.value})}/></div>
          <div><Label>الحد الأدنى</Label><Input type="number" value={form.min} onChange={e=>setForm({...form,min:+e.target.value})}/></div>
          <div className="md:col-span-4"><Button onClick={save} className="w-full bg-emerald-600">إنشاء الكوبون</Button></div>
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle className="text-base">الكوبونات ({list.length})</CardTitle></CardHeader>
        <CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>النوع</TableHead><TableHead>القيمة</TableHead><TableHead>الاستخدام</TableHead><TableHead>الحالة</TableHead><TableHead>إجراء</TableHead></TableRow></TableHeader>
          <TableBody>{list.map(c=>(
            <TableRow key={c.id}><TableCell className="font-mono font-bold">{c.code}</TableCell><TableCell>{c.discount_type==='percent'?'%':'ر.ي'}</TableCell><TableCell>{c.discount_value}</TableCell><TableCell>{c.used_count}/{c.max_uses||'∞'}</TableCell><TableCell>{c.is_active?<Badge className="bg-emerald-600">مفعل</Badge>:<Badge variant="secondary">معطل</Badge>}</TableCell><TableCell><Button size="sm" variant="outline" onClick={()=>toggle(c.id,c.is_active)}>تفعيل/تعطيل</Button></TableCell></TableRow>
          ))}</TableBody></Table></CardContent>
      </Card>
    </DashboardLayout>
  );
}
