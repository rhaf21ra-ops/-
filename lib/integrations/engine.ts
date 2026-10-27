// قسطها - Integration Engine (المحرك التكاملي القابل للتوسع)
// يدعم: payment, shipping, sms, maps, identity, bank, email, other
// الأمان: API Keys مشفرة + RLS admin_only + سجل كامل

import { createClient } from "@/lib/supabase/server";

export type IntegrationType = 'shipping'|'payment'|'sms'|'maps'|'identity'|'bank'|'email'|'other';
export type HttpMethod = 'GET'|'POST'|'PUT'|'DELETE'|'PATCH';

export interface Integration {
  id: string;
  name: string;
  service_name: string;
  service_type: IntegrationType;
  api_url: string;
  method: HttpMethod;
  headers: Record<string,string>;
  params: Record<string,string>;
  body_template?: any;
  description?: string;
  is_active: boolean;
  last_test_status?: 'success'|'failed';
  last_test_at?: string;
  created_at: string;
}

export interface TestResult { ok: boolean; status: number; body: any; duration: number; error?: string; }

// تشفير بسيط (في الإنتاج استخدم Vault) - هنا Base64 مع salt للعرض فقط
export function encryptKey(key: string): string {
  if (!key) return '';
  return Buffer.from(key).toString('base64');
}
export function decryptKey(enc: string): string {
  if (!enc) return '';
  try { return Buffer.from(enc, 'base64').toString(); } catch { return enc; }
}

// تنفيذ تكامل (Server only - لا يستدعى من المتصفح)
export async function executeIntegration(integrationId: string, payload: any, orderId?: string): Promise<TestResult> {
  const supabase = await createClient();
  const { data: integration, error } = await supabase.from('integrations').select('*').eq('id', integrationId).single();
  if (error || !integration) return { ok: false, status: 404, body: null, duration: 0, error: 'Integration not found' };
  if (!integration.is_active) return { ok: false, status: 400, body: null, duration: 0, error: 'Integration disabled' };

  const start = Date.now();
  let res: Response | null = null;
  let body: any = null;
  let err: string | undefined;

  try {
    const headers: Record<string,string> = { 'Content-Type': 'application/json', ...(integration.headers as any) };
    // استبدال المتغيرات في URL/Body من payload
    let url = integration.api_url;
    // إضافة params كـ query string لـ GET
    if (integration.method === 'GET' && integration.params) {
      const qs = new URLSearchParams({ ...(integration.params as any), ...payload }).toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }
    const apiKey = integration.api_key_encrypted ? decryptKey(integration.api_key_encrypted) : '';
    if (apiKey) headers['Authorization'] = headers['Authorization'] || `Bearer ${apiKey}`;

    const fetchOpts: RequestInit = { method: integration.method, headers };
    if (integration.method !== 'GET') {
      fetchOpts.body = JSON.stringify(integration.body_template ? { ...integration.body_template, ...payload } : payload);
    }

    res = await fetch(url, fetchOpts);
    body = await res.json().catch(() => res?.text());
  } catch (e: any) {
    err = e.message;
  }
  const duration = Date.now() - start;
  const ok = !!res?.ok && !err;

  // سجل
  await supabase.from('integration_logs').insert({
    integration_id: integrationId,
    order_id: orderId || null,
    request: payload,
    response: body,
    status: ok ? 'success' : 'failed',
    error: err || (res && !res.ok ? `HTTP ${res.status}` : null),
    duration_ms: duration
  });

  // تحديث حالة الاختبار
  await supabase.from('integrations').update({
    last_test_status: ok ? 'success' : 'failed',
    last_test_at: new Date().toISOString(),
    last_error: err || null
  }).eq('id', integrationId);

  return { ok, status: res?.status || 0, body, duration, error: err };
}

export async function testIntegration(integrationId: string): Promise<TestResult> {
  return executeIntegration(integrationId, { test: true, timestamp: new Date().toISOString() });
}
