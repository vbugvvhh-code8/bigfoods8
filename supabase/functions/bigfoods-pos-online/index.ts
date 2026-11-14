import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const URL=Deno.env.get("SUPABASE_URL")!, SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, PAYSTACK=Deno.env.get("PAYSTACK_SECRET_KEY");
const cors={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"POST, OPTIONS", "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info" };
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const sha256=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v))),b=>b.toString(16).padStart(2,"0")).join("");
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 let body:any;try{body=await req.json()}catch{return json({error:"Invalid request"},400)}
 const db=createClient(URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
 const action=String(body.action||"");
 try{
  if(action==="catalogue"){
   const lat=body.latitude==null?null:Number(body.latitude),lng=body.longitude==null?null:Number(body.longitude);
   if((lat!==null&&!Number.isFinite(lat))||(lng!==null&&!Number.isFinite(lng)))return json({error:"Invalid location"},400);
   const {data,error}=await db.rpc("bigfoods_pos_online_catalogue",{p_lat:lat,p_lng:lng,p_fulfilment:body.fulfilment||"pickup"});
   if(error)return json({error:error.message},400);
   return json(data);
  }
  if(action==="create_order"){
   if(!PAYSTACK)return json({error:"Online payments are not configured."},503);
   const name=typeof body.customer_name==="string"?body.customer_name.trim():"";
   const email=typeof body.customer_email==="string"?body.customer_email.trim():"";
   const phone=typeof body.customer_phone==="string"?body.customer_phone.trim():"";
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:"A valid email address is required for Paystack checkout."},400);
   const reference=crypto.randomUUID();
   const {data:order,error}=await db.rpc("bigfoods_pos_create_online_order",{
    p_fulfilment:body.fulfilment,p_customer_name:name,p_customer_email:email,p_customer_phone:phone,
    p_delivery_address:body.delivery_address??null,p_delivery_lat:body.latitude??null,p_delivery_lng:body.longitude??null,
    p_delivery_note:body.delivery_note??null,p_items:body.items,p_payment_reference:reference
   });
   if(error)return json({error:error.message},400);
   const origin=typeof body.callback_origin==="string"&&/^https:\/\//.test(body.callback_origin)?body.callback_origin:"https://bigfoods.app";
   const response=await fetch("https://api.paystack.co/transaction/initialize",{method:"POST",headers:{Authorization:`Bearer ${PAYSTACK}`,"Content-Type":"application/json"},body:JSON.stringify({email,amount:Math.round(Number(order.total_amount)*100),currency:"NGN",reference,callback_url:origin+"/online-order/payment",metadata:{type:"bigfoods_pos_online_order",order_id:order.order_id,order_number:order.order_number}})});
   const result=await response.json();
   if(!response.ok||result.status!==true){await db.rpc("bigfoods_pos_online_payment_finalize",{p_reference:reference,p_success:false});return json({error:result.message||"Could not initialize payment"},502)}
   return json({success:true,order_number:order.order_number,reference,authorization_url:result.data.authorization_url,access_code:result.data.access_code,total_amount:order.total_amount,branch_name:order.branch_name},201);
  }
  if(action==="verify_payment"){
   if(!PAYSTACK||typeof body.reference!=="string")return json({error:"Payment reference is required"},400);
   const check=await fetch("https://api.paystack.co/transaction/verify/"+encodeURIComponent(body.reference),{headers:{Authorization:`Bearer ${PAYSTACK}`}});
   const data=await check.json(),tx=data?.data;
   const {data:order,error}=await db.from("bigfoods_pos_online_orders").select("id,order_number,total_amount,payment_status").eq("payment_reference",body.reference).maybeSingle();
   if(error||!order)return json({error:"Order not found"},404);
   const valid=check.ok&&data.status===true&&tx?.status==="success"&&tx?.reference===body.reference&&tx?.currency==="NGN"&&Number(tx?.amount)===Math.round(Number(order.total_amount)*100);
   if(!valid){
    if(check.ok&&data.status===true&&["failed","abandoned"].includes(String(tx?.status)))await db.rpc("bigfoods_pos_online_payment_finalize",{p_reference:body.reference,p_success:false});
    return json({success:false,error:"Payment is not confirmed yet. If you were charged, contact BigFoods support with your order number."},409);
   }
   const {data:finalized,error:finalizeError}=await db.rpc("bigfoods_pos_online_payment_finalize",{p_reference:body.reference,p_success:true});
   if(finalizeError)return json({error:"Payment was received but order finalization needs support review.",order_number:order.order_number},503);
   if(finalized?.success!==true)return json({error:"This order was already cancelled after an unsuccessful payment attempt. Contact BigFoods support if Paystack charged you.",order_number:order.order_number},409);
   return json({success:true,order_number:order.order_number,order_id:order.id,already_processed:finalized?.already_processed===true});
  }
  const token=typeof body.session_token==="string"?body.session_token:"";
  if(!/^[0-9a-f]{64}$/i.test(token))return json({error:"Unauthenticated"},401);
  const {data:session}=await db.from("bigfoods_staff_sessions").select("staff_id,expires_at,revoked_at").eq("token_hash",await sha256(token)).maybeSingle();
  if(!session||session.revoked_at||new Date(session.expires_at).getTime()<=Date.now())return json({error:"Unauthenticated"},401);
  const {data:actor}=await db.from("bigfoods_staff").select("id,role,permissions,is_active,must_change_password").eq("id",session.staff_id).maybeSingle();
  if(!actor?.is_active||actor.must_change_password)return json({error:"Unauthenticated"},401);
  const perms=Array.isArray(actor.permissions)?actor.permissions:[];
  const admin=["owner","admin"].includes(actor.role);
  if(action==="staff_list"){
   if(!admin&&!perms.includes("pos.reports")&&!perms.includes("orders.view"))return json({error:"Forbidden"},403);
   let query=db.from("bigfoods_pos_online_orders").select("*,bigfoods_staff_work_locations(name,address),bigfoods_pos_online_order_items(*)").order("created_at",{ascending:false}).limit(150);
   let currentBranch=null;
   if(!admin){
    const {data:attendance}=await db.from("bigfoods_staff_attendance").select("work_location_id").eq("staff_id",actor.id).is("checked_out_at",null).maybeSingle();
    if(!attendance?.work_location_id)return json({error:"Check in at your assigned branch to view online orders."},409);
    currentBranch=attendance.work_location_id;
    query=query.eq("work_location_id",currentBranch);
   }
   const {data,error}=await query;
   if(error)return json({error:"Unable to load online orders"},503);
   return json({orders:data||[],current_branch_id:currentBranch});
  }
  if(action==="staff_update"){
   if(!admin&&!perms.includes("pos.sell")&&!perms.includes("orders.manage"))return json({error:"Forbidden"},403);
   const id=typeof body.order_id==="string"?body.order_id:"",status=String(body.status||"");
   const allowed=["accepted","ready","picked_up"];
   if(!id||!allowed.includes(status))return json({error:"Invalid order update"},400);
   const {data:order,error:loadError}=await db.from("bigfoods_pos_online_orders").select("id,status,payment_status,work_location_id,fulfilment_type").eq("id",id).maybeSingle();
   if(loadError||!order)return json({error:"Order not found"},404);
   const {data:attendance}=await db.from("bigfoods_staff_attendance").select("work_location_id").eq("staff_id",actor.id).is("checked_out_at",null).maybeSingle();
   if(!admin&&(!attendance||attendance.work_location_id!==order.work_location_id))return json({error:"Check in at the order's branch to manage it."},403);
   if(order.payment_status!=="paid")return json({error:"Only paid online orders can be processed."},409);
   const transitions:Record<string,string[]>={accepted:["confirmed"],ready:["accepted"],picked_up:["ready"]};
   if(status==="picked_up"&&order.fulfilment_type!=="pickup")return json({error:"Delivery orders must be completed through rider dispatch."},409);
   if(!transitions[status]?.includes(order.status))return json({error:"This status transition is not allowed. Paid orders cannot be rejected or cancelled until refund and stock-restoration handling is available."},409);
   const patch:any={status,updated_at:new Date().toISOString()};
   if(status==="accepted"){patch.accepted_by_staff_id=actor.id;patch.accepted_at=new Date().toISOString()}
   if(status==="ready")patch.ready_at=new Date().toISOString();
   const {data:updated,error}=await db.from("bigfoods_pos_online_orders").update(patch).eq("id",id).eq("status",order.status).select("id,status").maybeSingle();
   if(error||!updated)return json({error:"Order changed; refresh and try again."},409);
   await db.from("bigfoods_staff_audit_events").insert({actor_staff_id:actor.id,action:"pos.online_order_status_updated",details:{order_id:id,status}});
   return json({order:updated});
  }
  return json({error:"Unsupported action"},400);
 }catch(e){console.error("BIGFOODS_POS_ONLINE_ORDER_ERROR",e instanceof Error?e.message:String(e));return json({error:"Online ordering service unavailable"},503)}
});
