import { NextRequest, NextResponse } from "next/server";
import { sendOrderToBranchEmail } from "@/lib/branchEmail";
export async function POST(req: NextRequest){
  const { orderId } = await req.json();
  if(!orderId) return NextResponse.json({ok:false,error:'Missing orderId'},{status:400});
  const res = await sendOrderToBranchEmail(orderId);
  return NextResponse.json(res);
}
