import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!base||!key)return NextResponse.json({error:"Ordering service unavailable"},{status:503});
 try{
  const body=await req.json();
  const sessionToken=req.cookies.get("bf_staff_session")?.value;
  if(sessionToken)body.session_token=sessionToken;
  const response=await fetch(`${base}/functions/v1/bigfoods-pos-online`,{method:"POST",headers:{"Content-Type":"application/json",apikey:key},body:JSON.stringify(body),cache:"no-store"});
  const data=await response.json().catch(()=>({error:"Invalid ordering service response"}));
  return NextResponse.json(data,{status:response.status,headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Invalid request"},{status:400})}
}
