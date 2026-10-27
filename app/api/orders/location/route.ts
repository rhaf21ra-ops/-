import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest){
  const { orderId, location } = await req.json();
  if(!orderId || !location?.lat || !location?.lng) return NextResponse.json({ok:false,error:'Missing location'},{status:400});
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if(!user) return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  const { error } = await supabase.from('order_locations').insert({
    order_id: orderId,
    user_address_id: location.user_address_id || null,
    label: location.label || null,
    address_text: location.address_text || null,
    lat: location.lat,
    lng: location.lng
  });
  if(error) return NextResponse.json({ok:false,error:error.message},{status:400});
  return NextResponse.json({ok:true});
}
