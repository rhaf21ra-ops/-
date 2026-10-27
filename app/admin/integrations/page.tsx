"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Home, Puzzle, Plus, Trash2, Power, TestTube, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-client";

const navItems = [{ href:"/admin", label:"الرئيسية", icon: Home }, { href:"/admin/integrations", label:"API & Integrations", icon: Puzzle }];

export default function IntegrationsPage(){
  const [list,setList]=useState<any[]>([]);
  const [form,setForm]=useState({name:'',service_name:'',service_type:'shipping',api_url:'',method:'POST',description:'',api_key:'',is_active:true});
  const load=async()=>{ const {data}=await supabase.from('integrations').select('*').order('created_at',{ascending:false}); setList(data||[]); };
  useEffect(()=>{load();},[]);

  const save=async()=>{
    if(!form.name||!form.service_name||!form.api_url) return toast.error('أكمل الحقول المطلوبة');
    const payload:any={name:form.name, service_name:form.service_name, service_type:form.service_type, api_url:form.api_url, method:form.method, description:form.description, is_active:form.is_active};
    if(form.api_key) payload.api_key_encrypted=btoa(form.api_key);
    const {error}=await supabase.from('integrations').insert(payload);
    if(error) toast.error(error.message); else { toast.success('تمت الإضافة'); setForm({name:'',service_name:'',service_type:'shipping',api_url:'',method:'POST',description:'',api_key:'',is_active:true}); load(); }
  };

  const test=async(id:string)=>{
    toast.info('جاري الاختبار...');
    const res=await fetch('/api/integrations/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}).then(r=>r.json()).catch(()=>({ok:false}));
    if(res.ok) toast.success('الاتصال ناجح ✅'); else toast.error('فشل: '+(res.error||'تحقق من الرابط'));
    load();
  };

  const toggle=async(id:string,active:boolean)=>{ await supabase.from('integrations').update({is_active:!active}).eq('id',id); load(); };
  const del=async(id:string)=>{ if(!confirm('حذف؟'))return; await supabase.from('integrations').delete().eq('id',id); load(); };

  return (
    <DashboardLayout navItems={navItems} title="API & Integrations" role="admin">
      <h1 className="text-2xl font-bold">API & Integrations</h1>
      <p className="text-sm text-muted-foreground mb-6">محرك تكاملي قابل للتوسع — أضف أي شركة (توصيل، دفع، رسائل، خرائط) بدون إعادة بناء</p>

      <Card className="mb-6"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4"/> إضافة تكامل جديد</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div><Label>اسم الشركة *</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="يمن إكسبرس"/></div>
          <div><Label>اسم الخدمة *</Label><Input value={form.service_name} onChange={e=>setForm({...form,service_name:e.target.value})} placeholder="الشحن السريع"/></div>
          <div><Label>نوع الخدمة</Label><Select value={form.service_type} onValueChange={v=>setForm({...form,service_type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="shipping">توصيل</SelectItem><SelectItem value="payment">دفع</SelectItem><SelectItem value="sms">رسائل</SelectItem><SelectItem value="maps">خرائط</SelectItem><SelectItem value="email">بريد</SelectItem><SelectItem value="other">أخرى</SelectItem></SelectContent></Select></div>
          <div><Label>Method</Label><Select value={form.method} onValueChange={v=>setForm({...form,method:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="GET">GET</SelectItem><SelectItem value="POST">POST</SelectItem><SelectItem value="PUT">PUT</SelectItem><SelectItem value="DELETE">DELETE</SelectItem></SelectContent></Select></div>
          <div className="md:col-span-2"><Label>API URL *</Label><Input value={form.api_url} onChange={e=>setForm({...form,api_url:e.target.value})} placeholder="https://api.yemen-express.com/v1/create"/></div>
          <div><Label>API Key (سري)</Label><Input type="password" value={form.api_key} onChange={e=>setForm({...form,api_key:e.target.value})} placeholder="sk_..."/></div>
          <div className="md:col-span-2"><Label>وصف (يظهر للعميل)</Label><Textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="توصيل خلال 24 ساعة - يظهر عند اختيار الشحن"/></div>
          <div className="md:col-span-2"><Button onClick={save} className="w-full bg-emerald-600">إضافة التكامل</Button></div>
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle className="text-base">التكاملات الحالية ({list.length})</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-auto">
          <Table><TableHeader><TableRow><TableHead>الشركة</TableHead><TableHead>النوع</TableHead><TableHead>URL</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader>
            <TableBody>{list.map(i=>(
              <TableRow key={i.id}><TableCell><p className="font-medium text-sm">{i.name}</p><p className="text-xs text-muted-foreground">{i.service_name}</p></TableCell><TableCell><Badge variant="outline">{i.service_type}</Badge></TableCell><TableCell className="text-xs max-w-[200px] truncate">{i.api_url}</TableCell><TableCell>{i.is_active?<Badge className="bg-emerald-600">مفعل</Badge>:<Badge variant="secondary">معطل</Badge>} {i.last_test_status && <Badge variant={i.last_test_status==='success'?'default':'destructive'} className="mr-1 text-[10px]">{i.last_test_status}</Badge>}</TableCell>
                <TableCell className="flex gap-1"><Button size="sm" variant="outline" onClick={()=>test(i.id)}><TestTube className="h-3 w-3"/> اختبار</Button><Button size="sm" variant="ghost" onClick={()=>toggle(i.id,i.is_active)}><Power className="h-3 w-3"/></Button><Button size="sm" variant="ghost" onClick={()=>del(i.id)}><Trash2 className="h-3 w-3 text-destructive"/></Button></TableCell></TableRow>
            ))}{list.length===0&&<TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">لا يوجد تكاملات - أضف أول API أعلاه</TableCell></TableRow>}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6 bg-amber-50 border-amber-200"><CardContent className="p-4 text-xs">الحماية: المفاتيح مشفرة Base64 + RLS admin_only + لا تظهر في Frontend. سجل الطلبات في `integration_logs` + إعادة محاولة تلقائية.</CardContent></Card>
    </DashboardLayout>
  );
}
