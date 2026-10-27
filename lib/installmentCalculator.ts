// حاسبة التقسيط الاحترافية - قسطها
export interface CalcInput { price:number; down:number; months:number; profitRate:number; fees?:number; }
export interface CalcResult { remaining:number; monthly:number; total:number; profit:number; schedule:{n:number,due:Date,amount:number}[] }

export function calculateInstallment(input: CalcInput): CalcResult {
  const remaining = Math.max(0, input.price - input.down);
  const profit = remaining * (input.profitRate/100);
  const total = remaining + profit + (input.fees||0);
  const monthly = Math.round(total / input.months);
  const schedule = Array.from({length:input.months},(_,i)=>({n:i+1, due: new Date(Date.now()+ (i+1)*30*24*3600000), amount: monthly}));
  // تعديل الأخير لتطابق الإجمالي
  if(schedule.length>0) schedule[schedule.length-1].amount = total - monthly*(input.months-1);
  return { remaining, monthly, total: input.down + total, profit, schedule };
}

// جلب الخطط من DB
export async function getInstallmentPlans(merchantId?: string){
  const { supabase } = await import("@/lib/supabase-client");
  let q = supabase.from('installment_plans_config').select('*').eq('is_active',true).order('months');
  if(merchantId) q = q.or(`merchant_id.eq.${merchantId},merchant_id.is.null`);
  const { data } = await q;
  return data||[];
}
