import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST(req:NextRequest){
 const secret=process.env.BIGFOODS_STAFF_BOOTSTRAP_SECRET,base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!secret||secret.length<32||!base||!key)return NextResponse.json({error:"Bootstrap is not configured"},{status:503});
 try{
  const body=await req.json();
  const response=await fetch(`${base}/functions/v1/bigfoods-staff-admin`,{method:"POST",headers:{"Content-Type":"application/json",apikey:key},body:JSON.stringify({action:"bootstrap",bootstrap_secret:secret,email:body.email,display_name:body.display_name,password:body.password}),cache:"no-store"});
  const data=await response.json().catch(()=>({error:"Invalid response"}));
  return NextResponse.json(data,{status:response.status,headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Unable to initialize owner account"},{status:500})}
}