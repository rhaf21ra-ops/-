// إرسال طلب التقسيط لبريد الفرع تلقائياً - قسطها
import { createClient } from "@/lib/supabase/server";
import { executeIntegration } from "@/lib/integrations/engine";

export interface BranchEmailPayload {
  orderNumber: string;
  customerName: string;
  phone: string;
  productName: string;
  productImage?: string;
  cashPrice: number;
  downPayment?: number;
  remaining?: number;
  months?: number;
  monthly?: number;
  coupon?: string;
  discount?: number;
  branchName: string;
  branchEmail: string;
  location?: { lat:number,lng:number,label?:string,address_text?:string } | null;
  createdAt: string;
}

// بناء محتوى البريد HTML
export function buildBranchEmailHtml(p: BranchEmailPayload): string {
  const loc = p.location ? `${p.label || ''} - ${p.address_text || ''} (${p.lat}, ${p.lng}) - <a href="https://maps.google.com/?q=${p.lat},${p.lng}">فتح الخريطة</a>` : 'لم يحدد';
  return `
  <div dir="rtl" style="font-family:Tajawal,Arial;background:#f8fafc;padding:24px">
    <div style="max-width:600px;margin:auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 10px 20px rgba(0,0,0,0.08)">
      <div style="background:linear-gradient(135deg,#047857,#0f766e);color:white;padding:20px">
        <h2 style="margin:0">طلب تقسيط جديد - ${p.orderNumber}</h2>
        <p style="margin:4px 0 0;opacity:0.9">الفرع: ${p.branchName} - ${p.branchEmail}</p>
      </div>
      <div style="padding:20px">
        <p><b>العميل:</b> ${p.customerName} - ${p.phone}</p>
        <p><b>المنتج:</b> ${p.productName} ${p.productImage ? `<br><img src="${p.productImage}" style="width:120px;border-radius:8px;margin-top:8px"/>` : ''}</p>
        <p><b>السعر:</b> ${p.cashPrice} ر.ي | <b>الدفعة الأولى:</b> ${p.downPayment ?? 0} | <b>المتبقي:</b> ${p.remaining ?? p.cashPrice}</p>
        <p><b>المدة:</b> ${p.months ?? '-'} شهر | <b>القسط:</b> ${p.monthly ?? '-'} ر.ي</p>
        ${p.coupon ? `<p><b>الكوبون:</b> ${p.coupon} خصم ${p.discount ?? 0}</p>` : ''}
        <p><b>موقع العميل:</b> ${loc}</p>
        <p><b>التاريخ:</b> ${new Date(p.createdAt).toLocaleString('ar-YE')}</p>
        <a href="https://qistuhu.netlify.app/admin/orders" style="display:inline-block;margin-top:16px;background:#047857;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">عرض الطلب في لوحة التحكم →</a>
      </div>
    </div>
  </div>`;
}

// إرسال تلقائي عند إنشاء الطلب
export async function sendOrderToBranchEmail(orderId: string): Promise<{ok:boolean, error?:string}> {
  const supabase = await createClient();
  // جلب الطلب مع الفرع
  const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
  if (!order) return { ok:false, error:'Order not found' };
  const branchId = (order as any).branch_id || (order as any).branchId;
  if (!branchId) return { ok:false, error:'No branch' };
  const { data: branch } = await supabase.from('branches').select('id,name,branch_email').eq('id', branchId).single();
  if (!branch || !branch.branch_email) return { ok:false, error:'Branch email not set' };

  const { data: orderLocation } = await supabase.from('order_locations').select('*').eq('order_id', orderId).single();
  // جلب أول منتج للعرض
  const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId).limit(1);
  const product = items?.[0];

  const payload: BranchEmailPayload = {
    orderNumber: order.order_number || order.orderNumber || orderId.slice(0,8),
    customerName: order.customer_name || order.customerName || 'عميل',
    phone: order.phone || '',
    productName: product?.product_name || product?.productName || 'منتج',
    productImage: product?.product_image,
    cashPrice: product?.cash_price || order.total || 0,
    downPayment: (order as any).down_payment,
    remaining: (order as any).remaining,
    months: (order as any).months,
    monthly: (order as any).monthly_installment,
    coupon: (order as any).coupon_code,
    discount: (order as any).discount,
    branchName: branch.name,
    branchEmail: branch.branch_email,
    location: orderLocation ? { lat: orderLocation.lat, lng: orderLocation.lng, label: orderLocation.label, address_text: orderLocation.address_text } : null,
    createdAt: order.created_at || order.createdAt || new Date().toISOString()
  };

  const html = buildBranchEmailHtml(payload);
  const subject = `طلب تقسيط جديد ${payload.orderNumber} - ${payload.customerName} - ${payload.branchName}`;

  // ابحث عن تكامل بريد مفعل
  const { data: integrations } = await supabase.from('integrations').select('*').eq('service_type','email').eq('is_active',true).limit(1);
  let sent = false; let lastError: string | undefined;
  if (integrations && integrations.length > 0) {
    const res = await executeIntegration(integrations[0].id, { to: branch.branch_email, subject, html, text: subject }, orderId);
    sent = res.ok; lastError = res.error;
  } else {
    // لا يوجد تكامل بريد - نسجل فقط (للتجربة). في الإنتاج اربط Resend/SMTP
    lastError = 'No email integration configured - logged only';
    sent = false;
  }

  // سجل تاريخي (لا يتغير بتغيير بريد الفرع لاحقاً)
  await supabase.from('branch_email_logs').insert({
    order_id: orderId,
    branch_id: branchId,
    branch_email: branch.branch_email,
    status: sent ? 'sent' : 'failed',
    attempts: 1,
    last_error: lastError || null,
    email_subject: subject,
    email_body: html,
    sent_at: sent ? new Date().toISOString() : null
  });

  return { ok: sent, error: lastError };
}

export async function retryBranchEmail(logId: string): Promise<{ok:boolean}> {
  const supabase = await createClient();
  const { data: log } = await supabase.from('branch_email_logs').select('*').eq('id', logId).single();
  if (!log) return { ok:false };
  // إعادة المحاولة ترسل لنفس البريد المحفوظ تاريخياً (لا يتأثر بتغيير بريد الفرع الآن)
  const { data: integration } = await supabase.from('integrations').select('*').eq('service_type','email').eq('is_active',true).limit(1).single();
  if (!integration) return { ok:false };
  const res = await executeIntegration(integration.id, { to: log.branch_email, subject: log.email_subject, html: log.email_body }, log.order_id);
  await supabase.from('branch_email_logs').update({
    status: res.ok ? 'sent' : 'failed',
    attempts: log.attempts + 1,
    last_error: res.error || null,
    sent_at: res.ok ? new Date().toISOString() : log.sent_at
  }).eq('id', logId);
  return { ok: res.ok };
}
