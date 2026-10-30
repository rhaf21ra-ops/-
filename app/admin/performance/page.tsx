"use client"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { adminNavItems } from "@/lib/admin-nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, Zap, Database, HardDrive, Shield, Clock, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react"
import { toast } from "sonner"

type Check = { name: string; status: 'ok'|'warning'|'error'; message: string; duration?: number }

export default function PerformancePage() {
  const [checks, setChecks] = useState<Check[] | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)

  const run = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cron/performance', { method: 'GET' })
      const j = await res.json()
      setChecks(j.checks || [])
      setScore(j.score ?? 0)
      setLastRun(j.timestamp || new Date().toISOString())
      if (j.score >= 80) toast.success(`الأداء ممتاز: ${j.score}%`)
      else if (j.score >= 60) toast.warning(`الأداء متوسط: ${j.score}%`)
      else toast.error(`يحتاج تحسين: ${j.score}%`)
    } catch {
      toast.error('تعذر الفحص')
    }
    setLoading(false)
  }

  useEffect(() => { run() }, [])

  const icon: Record<string, any> = {
    'قاعدة البيانات': Database,
    'التخزين (Storage)': HardDrive,
    'المصادقة': Shield,
    'زمن التحميل': Clock,
    'PWA': Zap,
  }

  return (
    <DashboardLayout navItems={adminNavItems} title="الأداء والمراقبة" role="admin">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-emerald-600"/> مراقبة الأداء</h1>
          <p className="text-sm text-muted-foreground">فحص تلقائي كل 24 ساعة + تحسين ذاتي • آخر فحص: {lastRun ? new Date(lastRun).toLocaleString('ar-YE') : '—'}</p>
        </div>
        <Button onClick={run} disabled={loading}><RefreshCw className={`h-4 w-4 ml-2 ${loading?'animate-spin':''}`}/> فحص الآن</Button>
      </div>

      {score !== null && (
        <Card className="mb-6 border-0 shadow-lg overflow-hidden">
          <div className={`p-6 text-white ${score>=80?'bg-gradient-to-r from-emerald-600 to-teal-700': score>=60?'bg-gradient-to-r from-amber-500 to-orange-600':'bg-gradient-to-r from-red-500 to-rose-600'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">نتيجة الصحة العامة</p>
                <p className="text-4xl font-black">{score}%</p>
                <p className="text-sm opacity-90 mt-1">{score>=80?'ممتاز - النظام يعمل بكفاءة': score>=60?'جيد - يحتاج تحسينات بسيطة':'يحتاج تدخل فوري'}</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-2xl p-4">
                {score>=80 ? <CheckCircle className="h-10 w-10"/> : score>=60 ? <AlertTriangle className="h-10 w-10"/> : <XCircle className="h-10 w-10"/>}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {(checks || []).map((c, i) => {
          const Icon = (icon as any)[c.name] || Activity
          return (
            <Card key={i} className={`border-l-4 ${c.status==='ok'?'border-l-emerald-500': c.status==='warning'?'border-l-amber-500':'border-l-red-500'}`}>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4"/>{c.name}
                <Badge variant={c.status==='ok'?'default': c.status==='warning'?'secondary':'destructive'} className="mr-auto text-xs">
                  {c.status==='ok'?'سليم': c.status==='warning'?'تنبيه':'خطأ'}
                </Badge>
              </CardTitle></CardHeader>
              <CardContent><p className="text-sm">{c.message}</p>{c.duration && <p className="text-xs text-muted-foreground mt-1">{c.duration}ms</p>}</CardContent>
            </Card>
          )
        })}
        {!checks && <Card className="col-span-3 p-8 text-center text-muted-foreground">جاري الفحص...</Card>}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5"/> الجدولة التلقائية</CardTitle><CardDescription>النظام يفحص نفسه كل 24 ساعة ويحسّن الأداء تلقائياً</CardDescription></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-600"/> فحص قاعدة البيانات والـ Storage والمصادقة</div>
          <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-600"/> قياس زمن التحميل وتحسين التخزين المؤقت</div>
          <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-600"/> تسجيل النتائج في سجل العمليات</div>
          <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-600"/> إشعار عند انخفاض الأداء &lt; 60%</div>
          <p className="text-xs text-muted-foreground pt-2">Endpoint: <code className="bg-muted px-2 py-1 rounded">GET /api/cron/performance</code> — اربطه بـ Netlify Scheduled Functions أو cron خارجي كل 24h</p>
          <div className="bg-muted p-3 rounded-lg text-xs font-mono dir-ltr">
            0 2 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://qistuha.netlify.app/api/cron/performance
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
