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

export default function AdsPage(){
  const [list,setList]=useState<any[]>([]);
  const [form,setForm]=useState({title:'',position:'homepage',link:'',active:true});
  const load=async()=>{ const {data}=await supabase.from('advertisements').select('*').order('priority'); setList(data||[]); };
  useEffect(()=>{load();},[]);
  const save=async()=>{
    if(!form.title) return toast.error('أدخل العنوان');
    const {error}=await supabase.from('advertisements').insert({title:form.title, position:form.position, link_url:form.link, is_active:form.active});
    if(error) toast.error(error.message); else { toast.success('تم'); load(); }
  };
  return (
    <DashboardLayout navItems={adminNavItems} title="الإعلانات" role="admin">
      <h1 className="text-2xl font-bold">نظام الإعلانات</h1><p className="text-sm text-muted-foreground mb-6">إنشاء إعلانات + إحصائيات ظهور/نقرات/CTR</p>
      <Card className="mb-6"><CardHeader><CardTitle className="text-base">إعلان جديد</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div><Label>عنوان</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
          <div><Label>مكان الظهور</Label><Select value={form.position} onValueChange={v=>setForm({...form,position:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="homepage">الرئيسية</SelectItem><SelectItem value="shop">المتجر</SelectItem><SelectItem value="popup">منبثق</SelectItem></SelectContent></Select></div>
          <div><Label>رابط</Label><Input value={form.link} onChange={e=>setForm({...form,link:e.target.value})}/></div>
          <div className="md:col-span-3"><Button onClick={save} className="w-full bg-emerald-600">إنشاء</Button></div>
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle className="text-base">الإعلانات ({list.length})</CardTitle></CardHeader>
        <CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>العنوان</TableHead><TableHead>المكان</TableHead><TableHead>ظهور</TableHead><TableHead>نقرات</TableHead><TableHead>CTR</TableHead></TableRow></TableHeader>
          <TableBody>{list.map(a=><TableRow key={a.id}><TableCell>{a.title}</TableCell><TableCell><Badge variant="outline">{a.position}</Badge></TableCell><TableCell>{a.views}</TableCell><TableCell>{a.clicks}</TableCell><TableCell>{a.views?((a.clicks/a.views)*100).toFixed(1)+'%':'-'}</TableCell></TableRow>)}</TableBody></Table></CardContent>
      </Card>
    </DashboardLayout>
  );
}
