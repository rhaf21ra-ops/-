// نظام مواقع المستخدمين - قسطها
import { createClient } from "@/lib/supabase/client";

export interface UserAddress {
  id: string;
  user_id: string;
  label: string; // المنزل | العمل | موقع آخر
  label_custom?: string;
  address_text?: string;
  lat: number;
  lng: number;
  is_default: boolean;
}

export async function getMyAddresses() {
  const { supabase } = await import("@/lib/supabase-client").then(m=>({supabase:m.supabase}));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from('user_addresses').select('*').eq('user_id', user.id).order('is_default', {ascending:false});
  return (data || []) as UserAddress[];
}

export async function saveAddress(addr: Omit<UserAddress,'id'|'user_id'|'created_at'>) {
  const { supabase } = await import("@/lib/supabase-client").then(m=>({supabase:m.supabase}));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول');
  const { data, error } = await supabase.from('user_addresses').insert({ ...addr, user_id: user.id }).select().single();
  if (error) throw error;
  return data;
}

// حفظ موقع الطلب كنسخة مجمدة (لا تتغير لاحقاً)
export async function saveOrderLocation(orderId: string, address: { lat:number,lng:number,label?:string,address_text?:string, user_address_id?:string }) {
  const supabase = (await import("@/lib/supabase/server")).createClient;
  const client = await supabase();
  const { error } = await client.from('order_locations').insert({
    order_id: orderId,
    user_address_id: address.user_address_id || null,
    label: address.label || null,
    address_text: address.address_text || null,
    lat: address.lat,
    lng: address.lng
  });
  if (error) throw error;
}
