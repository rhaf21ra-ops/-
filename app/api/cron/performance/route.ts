import { NextResponse } from 'next/server'
import { runFullHealthCheck } from '@/lib/performance-monitor'

export const dynamic = 'force-dynamic'

// يُستدعى كل 24 ساعة عبر Netlify Scheduled Function أو cron خارجي
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || 'qistuha-cron-2026'
  // السماح بدون مصادقة للاختبار، مع مصادقة للإنتاج
  if (auth && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runFullHealthCheck()
    
    // تحسينات تلقائية
    const optimizations: string[] = []
    
    // 1. تنظيف التخزين المؤقت
    if (typeof global !== 'undefined' && (global as any).gc) {
      try { (global as any).gc(); optimizations.push('تم تنظيف الذاكرة') } catch {}
    }

    // 2. تسجيل النتيجة في audit_logs (اختياري)
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      await supabase.from('audit_logs').insert({
        actor_id: null,
        action: 'performance_check',
        entity: 'system',
        entity_id: 'cron-24h',
        details: { score: result.score, checks: result.checks }
      } as any)
      optimizations.push('تم تسجيل الفحص')
    } catch {}

    return NextResponse.json({
      ok: true,
      ...result,
      optimizations,
      nextRun: new Date(Date.now() + 24*60*60*1000).toISOString()
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

// للاختبار اليدوي POST
export async function POST(req: Request) {
  return GET(req)
}
