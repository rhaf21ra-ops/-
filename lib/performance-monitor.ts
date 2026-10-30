// نظام مراقبة الأداء التلقائي - يعمل كل 24 ساعة
export interface HealthCheck {
  name: string
  status: 'ok' | 'warning' | 'error'
  message: string
  duration?: number
  fix?: string
}

export async function runFullHealthCheck(): Promise<{ checks: HealthCheck[]; score: number; timestamp: string }> {
  const checks: HealthCheck[] = []
  const start = Date.now()

  // 1. قاعدة البيانات
  try {
    const { supabase } = await import('@/lib/supabase-client')
    const t0 = Date.now()
    const { error } = await supabase.from('products').select('id', { count: 'exact', head: true }).limit(1)
    checks.push({
      name: 'قاعدة البيانات',
      status: error ? 'error' : 'ok',
      message: error ? error.message : `متصلة - ${Date.now() - t0}ms`,
      duration: Date.now() - t0
    })
  } catch (e: any) {
    checks.push({ name: 'قاعدة البيانات', status: 'error', message: e.message })
  }

  // 2. التخزين
  try {
    const { supabase } = await import('@/lib/supabase-client')
    const { data, error } = await supabase.storage.listBuckets()
    const buckets = data?.length || 0
    checks.push({
      name: 'التخزين (Storage)',
      status: error ? 'error' : buckets >= 3 ? 'ok' : 'warning',
      message: error ? error.message : `${buckets} حاويات نشطة`
    })
  } catch (e: any) {
    checks.push({ name: 'التخزين', status: 'error', message: e.message })
  }

  // 3. المصادقة
  try {
    const { supabase } = await import('@/lib/supabase-client')
    const { data } = await supabase.auth.getSession()
    checks.push({
      name: 'المصادقة',
      status: 'ok',
      message: data.session ? `مسجل: ${data.session.user.email}` : 'جاهز للاستقبال'
    })
  } catch (e: any) {
    checks.push({ name: 'المصادقة', status: 'warning', message: 'غير متاح' })
  }

  // 4. الأداء
  const loadTime = Date.now() - start
  checks.push({
    name: 'زمن التحميل',
    status: loadTime < 1000 ? 'ok' : loadTime < 3000 ? 'warning' : 'error',
    message: `${loadTime}ms`,
    duration: loadTime
  })

  // 5. PWA
  checks.push({
    name: 'PWA',
    status: typeof window !== 'undefined' && 'serviceWorker' in navigator ? 'ok' : 'warning',
    message: 'serviceWorker متاح'
  })

  const score = Math.round((checks.filter(c => c.status === 'ok').length / checks.length) * 100)
  return { checks, score, timestamp: new Date().toISOString() }
}

export const PERFORMANCE_FIXES: Record<string, string> = {
  'بطء التحميل': 'تفعيل التخزين المؤقت (ISR) وضغط الصور إلى WebP',
  'خطأ قاعدة البيانات': 'تحقق من متغيرات Netlify وأعد النشر',
  'مشكلة التخزين': 'تأكد من صلاحيات bucket product-images public',
}
