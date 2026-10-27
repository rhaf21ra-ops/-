"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase-client";
import { toast } from "sonner";
export default function AdvancedSettings(){
  const [settings,setSettings]=useState<any[]>([]);
  const load=async()=>{ const {data}=await supabase.from('system_settings').select('*'); setSettings(data||[]); };
  useEffect(()=>{load();},[]);
  const save=async(k:string,v:any)=>{ await supabase.from('system_settings').upsert({key:k, value:v}); toast.success('تم الحفظ'); load(); };
  return (
    <DashboardLayout navItems={adminNavItems} title="إعدادات النظام" role="admin">
      <h1 className="text-2xl font-bold">إعدادات النظام المركزية</h1><p className="text-sm text-muted-foreground mb-6">كل النسب والرسوم قابلة للتعديل بدون كود</p>
      {settings.map(s=>(
        <Card key={s.key} className="mb-4"><CardHeader><CardTitle className="text-base">{s.key}</CardTitle><p className="text-xs text-muted-foreground">{s.description}</p></CardHeader>
          <CardContent className="flex gap-2"><Input defaultValue={JSON.stringify(s.value)} id={`val-${s.key}`} className="font-mono text-xs"/><Button size="sm" onClick={()=>{ try{ const v=JSON.parse((document.getElementById(`val-${s.key}`) as HTMLInputElement).value); save(s.key,v);}catch{toast.error('JSON غير صحيح');}}}>حفظ</Button></CardContent>
        </Card>
      ))}
    </DashboardLayout>
  );
}
