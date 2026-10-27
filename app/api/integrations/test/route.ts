import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { testIntegration } from "@/lib/integrations/engine";

export async function POST(req: NextRequest){
  const { id } = await req.json();
  if(!id) return NextResponse.json({ok:false,error:'Missing id'},{status:400});
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if(!user) return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  // تحقق admin
  const { data: roles } = await supabase.from('user_roles').select('role_id, roles(name)').eq('user_id', user.id);
  const isAdmin = roles?.some((r:any)=>r.roles?.name==='admin');
  if(!isAdmin) return NextResponse.json({ok:false,error:'Forbidden'},{status:403});

  const result = await testIntegration(id);
  return NextResponse.json(result);
}
