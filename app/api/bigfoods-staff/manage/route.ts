import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const COOKIE = "bf_staff_session";
async function invoke(token:string, body:Record<string,unknown>) {
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!base||!key) return {status:503,data:{error:"Staff service unavailable"}};
  const response=await fetch(`${base}/functions/v1/bigfoods-staff-admin`,{method:"POST",headers:{"Content-Type":"application/json",apikey:key},body:JSON.stringify({...body,session_token:token}),cache:"no-store"});
  return {status:response.status,data:await response.json().catch(()=>({error:"Invalid staff service response"}))};
}
export async function GET(req:NextRequest){
 const token=req.cookies.get(COOKIE)?.value;if(!token)return NextResponse.json({error:"Unauthenticated"},{status:401});
 const result=await invoke(token,{action:"list"});return NextResponse.json(result.data,{status:result.status,headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:NextRequest){
 const token=req.cookies.get(COOKIE)?.value;if(!token)return NextResponse.json({error:"Unauthenticated"},{status:401});
 try{const body=await req.json();const result=await invoke(token,{action:"create",email:body.email,display_name:body.display_name,role:body.role,temporary_password:body.temporary_password});return NextResponse.json(result.data,{status:result.status,headers:{"Cache-Control":"no-store"}})}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
}
export async function PATCH(req:NextRequest){
 const token=req.cookies.get(COOKIE)?.value;if(!token)return NextResponse.json({error:"Unauthenticated"},{status:401});
 try{const body=await req.json();const result=await invoke(token,{action:"set_active",staff_id:body.staff_id,is_active:body.is_active});return NextResponse.json(result.data,{status:result.status,headers:{"Cache-Control":"no-store"}})}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
}