// نظام الإحالة - قسطها
import { supabase } from "@/lib/supabase-client";

export function genCode(userId:string){ return 'QST'+userId.slice(0,6).toUpperCase()+Math.random().toString(36).slice(2,4).toUpperCase(); }

export async function getMyReferral(){
  const { data:{user} } = await supabase.auth.getUser();
  if(!user) return null;
  let { data } = await supabase.from('referral_codes').select('*').eq('user_id',user.id).single();
  if(!data){ const code=genCode(user.id); const { data:ins }=await supabase.from('referral_codes').insert({user_id:user.id, code}).select().single(); data=ins; }
  const { data: refs } = await supabase.from('referrals').select('*').eq('referrer_id',user.id);
  return { code: data, referrals: refs||[] };
}

export async function applyReferral(code:string, newUserId:string){
  const { data: ref } = await supabase.from('referral_codes').select('*').eq('code',code).single();
  if(!ref) throw new Error('كود غير صحيح');
  if(ref.user_id===newUserId) throw new Error('لا يمكنك استخدام كودك');
  await supabase.from('referrals').insert({referrer_id: ref.user_id, referred_id: newUserId, reward_points: 100});
  await supabase.from('referral_codes').update({uses: ref.uses+1}).eq('user_id',ref.user_id);
  const { earnPoints } = await import("./loyalty");
  await earnPoints(ref.user_id, 100, 'إحالة صديق');
  await earnPoints(newUserId, 50, 'التسجيل عبر إحالة');
}
