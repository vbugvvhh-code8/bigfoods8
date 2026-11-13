import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
 const token=req.cookies.get("bf_staff_session")?.value, authorization=req.headers.get("authorization");
 if(!token&&!authorization)return NextResponse.json({error:"Unauthenticated"},{status:401});
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!base||!key)return NextResponse.json({error:"Inventory service unavailable"},{status:503});
 try { const body=await req.json(); const response=await fetch(`${base}/functions/v1/bigfoods-inventory`,{method:"POST",headers:{"Content-Type":"application/json",apikey:key,Authorization:authorization||`Bearer ${key}`},body:JSON.stringify({...body,...(token?{session_token:token}:{})}),cache:"no-store"}); const data=await response.json().catch(()=>({error:"Invalid inventory response"})); return NextResponse.json(data,{status:response.status,headers:{"Cache-Control":"no-store"}}); } catch { return NextResponse.json({error:"Invalid request"},{status:400}); }
}