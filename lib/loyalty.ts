// نظام النقاط والولاء - قسطها
import { supabase } from "@/lib/supabase-client";

export async function earnPoints(userId:string, amount:number, reason:string, orderId?:string){
  await supabase.from('points_transactions').insert({user_id:userId, type:'earn', amount, reason, order_id: orderId||null});
  const { data } = await supabase.from('loyalty_points').select('*').eq('user_id',userId).single();
  if(data) await supabase.from('loyalty_points').update({balance: data.balance+amount, total_earned: data.total_earned+amount}).eq('user_id',userId);
  else await supabase.from('loyalty_points').insert({user_id:userId, balance:amount, total_earned:amount});
}

export async function usePoints(userId:string, amount:number, reason:string){
  const { data } = await supabase.from('loyalty_points').select('*').eq('user_id',userId).single();
  if(!data || data.balance < amount) throw new Error('رصيد غير كاف');
  await supabase.from('points_transactions').insert({user_id:userId, type:'use', amount, reason});
  await supabase.from('loyalty_points').update({balance: data.balance-amount, total_used: data.total_used+amount}).eq('user_id',userId);
}

export async function getMyPoints(){
  const { data:{user} } = await supabase.auth.getUser();
  if(!user) return null;
  const { data: bal } = await supabase.from('loyalty_points').select('*').eq('user_id',user.id).single();
  const { data: tx } = await supabase.from('points_transactions').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50);
  return { balance: bal, transactions: tx||[] };
}
