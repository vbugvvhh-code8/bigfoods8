import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const origin = Deno.env.get("STAFF_LOGIN_ALLOWED_ORIGIN") ?? "https://bigfoods.com";
const headers = { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Vary": "Origin" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const encoder = new TextEncoder();
function hex(bytes: Uint8Array) { return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""); }
function unhex(value: string) { if (!/^(?:[0-9a-f]{2})+$/i.test(value)) return new Uint8Array(); return new Uint8Array(value.match(/.{2}/g)!.map(v => parseInt(v,16))); }
async function digest(value: string) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)))); }
async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name:"PBKDF2", salt:unhex(salt), iterations:310000, hash:"SHA-256" }, key, 256)));
}
async function actorFor(db: any, token: string) {
  if (!/^[0-9a-f]{64}$/i.test(token)) return null;
  const { data: session } = await db.from("bigfoods_staff_sessions").select("id,staff_id,expires_at,revoked_at").eq("token_hash", await digest(token)).maybeSingle();
  if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) return null;
  const { data: staff } = await db.from("bigfoods_staff").select("id,email,display_name,role,permissions,is_active").eq("id", session.staff_id).maybeSingle();
  if (!staff?.is_active) return null;
  return staff;
}
function randomHex(size:number) { return hex(crypto.getRandomValues(new Uint8Array(size))); }
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error:"Method not allowed" },405);
  const reqOrigin = req.headers.get("Origin");
  if (reqOrigin && reqOrigin !== origin) return json({ error:"Not allowed" },403);
  let body:any;
  try { body = await req.json(); } catch { return json({ error:"Invalid request" },400); }
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error:"Staff service unavailable" },503);
  const db = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const action = typeof body.action === "string" ? body.action : "";
  try {
    if (action === "bootstrap") {
      const secret = Deno.env.get("BIGFOODS_STAFF_BOOTSTRAP_SECRET");
      if (!secret || typeof body.bootstrap_secret !== "string" || body.bootstrap_secret.length < 32 || body.bootstrap_secret !== secret) return json({ error:"Not authorized" },403);
      const { count, error } = await db.from("bigfoods_staff").select("id",{count:"exact",head:true});
      if (error) return json({ error:"Unable to initialize staff system" },503);
      if ((count ?? 0) !== 0) return json({ error:"Bootstrap is already closed" },409);
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !displayName || displayName.length > 120 || password.length < 14 || password.length > 1024) return json({ error:"Use a valid email, name, and password of at least 14 characters" },400);
      const salt = randomHex(16), hashed = await passwordHash(password,salt);
      const { data: staff, error: insertError } = await db.from("bigfoods_staff").insert({ email,display_name:displayName,role:"owner",permissions:["staff.manage","staff.view","inventory.manage","inventory.view","pos.manage","pos.view","audit.view"],password_hash:hashed,password_salt:salt,is_active:true,must_change_password:false }).select("id,email,display_name,role").single();
      if (insertError || !staff) return json({ error:"Unable to create initial owner" },409);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id:staff.id,action:"staff.bootstrap",details:{role:"owner"} });
      return json({ ok:true,staff },201);
    }
    const token = typeof body.session_token === "string" ? body.session_token : "";
    const actor = await actorFor(db,token);
    if (!actor) return json({ error:"Unauthenticated" },401);
    if (action === "change_password") {
      const currentPassword = typeof body.current_password === "string" ? body.current_password : "";
      const newPassword = typeof body.new_password === "string" ? body.new_password : "";
      if (newPassword.length < 14 || newPassword.length > 1024) return json({ error:"New password must be at least 14 characters." },400);
      const { data: account } = await db.from("bigfoods_staff").select("id,password_hash,password_salt").eq("id",actor.id).maybeSingle();
      if (!account) return json({ error:"Unable to verify account" },401);
      const currentHash = await passwordHash(currentPassword,account.password_salt);
      if (currentHash !== account.password_hash) return json({ error:"Current password is incorrect." },401);
      const salt = randomHex(16), hashed = await passwordHash(newPassword,salt);
      const { error } = await db.from("bigfoods_staff").update({password_hash:hashed,password_salt:salt,must_change_password:false,failed_login_count:0,locked_until:null,updated_at:new Date().toISOString()}).eq("id",actor.id);
      if (error) return json({error:"Unable to change password"},503);
      await db.from("bigfoods_staff_sessions").update({revoked_at:new Date().toISOString()}).eq("staff_id",actor.id).is("revoked_at",null);
      await db.from("bigfoods_staff_audit_events").insert({actor_staff_id:actor.id,action:"staff.password_changed",details:{}});
      return json({ok:true,sign_in_again:true});
    }
    if (actor.role !== "owner" && actor.role !== "admin" && !(Array.isArray(actor.permissions) && actor.permissions.includes("staff.manage"))) return json({ error:"Forbidden" },403);
    if (action === "list") {
      const { data, error } = await db.from("bigfoods_staff").select("id,email,display_name,role,permissions,is_active,must_change_password,last_login_at,created_at").order("created_at",{ascending:false});
      if (error) return json({ error:"Unable to load staff" },503);
      return json({ staff:data ?? [] });
    }
    if (action === "deactivate") {
      const id = typeof body.staff_id === "string" ? body.staff_id : "";
      if (!id) return json({ error: "Staff account ID is required" }, 400);
      if (id === actor.id) return json({ error: "You cannot deactivate your own account" }, 400);
      const { data: target } = await db.from("bigfoods_staff").select("id,role").eq("id",id).maybeSingle();
      if (!target) return json({ error: "Staff account not found" },404);
      if (target.role === "owner" && actor.role !== "owner") return json({ error: "Only the owner can change owner accounts" },403);
      const { error } = await db.from("bigfoods_staff").update({ is_active:false, updated_at:new Date().toISOString() }).eq("id",id);
      if (error) return json({ error:"Unable to deactivate staff account" },503);
      await db.from("bigfoods_staff_sessions").update({ revoked_at:new Date().toISOString() }).eq("staff_id",id).is("revoked_at",null);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id:actor.id,subject_staff_id:id,action:"staff.deactivate",details:{} });
      return json({ ok:true });
    }
    if (action === "update") {
      const id = typeof body.staff_id === "string" ? body.staff_id : "";
      if (!id) return json({ error:"Staff account ID is required" },400);
      const { data: target } = await db.from("bigfoods_staff").select("id,role").eq("id",id).maybeSingle();
      if (!target) return json({ error:"Staff account not found" },404);
      if (target.role === "owner" && actor.role !== "owner") return json({ error:"Only the owner can update owner accounts" },403);
      const updates:Record<string,unknown> = { updated_at:new Date().toISOString() };
      if (typeof body.email === "string") {
        const email = body.email.trim().toLowerCase();
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return json({ error:"Enter a valid email address" },400);
        updates.email = email;
      }
      if (typeof body.display_name === "string") {
        const name = body.display_name.trim();
        if (!name || name.length > 120) return json({ error:"Enter a valid display name" },400);
        updates.display_name = name;
      }
      if (typeof body.role === "string") {
        const roles = ["admin","manager","inventory","pos","support","auditor"];
        if (!roles.includes(body.role)) return json({ error:"Invalid staff role" },400);
        if (body.role === "admin" && actor.role !== "owner") return json({ error:"Only the owner can grant administrator access" },403);
        updates.role = body.role;
        const permissionsByRole:Record<string,string[]> = {admin:["staff.manage","staff.view","inventory.manage","inventory.view","pos.manage","pos.view","audit.view"],manager:["staff.view","inventory.view","inventory.manage","pos.view","pos.manage","audit.view"],inventory:["inventory.view","inventory.manage"],pos:["pos.view","pos.manage"],support:["staff.view"],auditor:["staff.view","inventory.view","pos.view","audit.view"]};
        updates.permissions = permissionsByRole[body.role];
      }
      if (typeof body.phone === "string") updates.phone = body.phone.trim() || null;
      if (typeof body.job_title === "string") updates.job_title = body.job_title.trim() || null;
      if (typeof body.start_date === "string") {
        if (body.start_date && !/^\\d{4}-\\d{2}-\\d{2}$/.test(body.start_date)) return json({ error:"Start date must use YYYY-MM-DD" },400);
        updates.start_date = body.start_date || null;
      }
      if (body.monthly_salary !== undefined) {
        const salary = Number(body.monthly_salary);
        if (!Number.isFinite(salary) || salary < 0 || salary > 1000000000) return json({ error:"Enter a valid monthly salary" },400);
        updates.monthly_salary = salary;
      }
      if (typeof body.is_active === "boolean") {
        if (id === actor.id && body.is_active === false) return json({ error:"You cannot deactivate your own account" },400);
        updates.is_active = body.is_active;
      }
      const { data: updated, error } = await db.from("bigfoods_staff").update(updates).eq("id",id).select("id,email,display_name,role,permissions,is_active,must_change_password,phone,job_title,start_date,monthly_salary,last_login_at,created_at").single();
      if (error || !updated) return json({ error:"Unable to update staff account; email may already exist" },409);
      if (body.is_active === false) await db.from("bigfoods_staff_sessions").update({revoked_at:new Date().toISOString()}).eq("staff_id",id).is("revoked_at",null);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id:actor.id,subject_staff_id:id,action:"staff.update",details:{ fields:Object.keys(updates).filter(k=>k!=="updated_at") } });
      return json({ staff:updated });
    }
    if (action === "create") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const name = typeof body.display_name === "string" ? body.display_name.trim() : "";
      const role = typeof body.role === "string" ? body.role : "";
      const password = typeof body.temporary_password === "string" ? body.temporary_password : "";
      const roles = ["admin","manager","inventory","pos","support","auditor"];
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length > 120 || !roles.includes(role) || password.length < 14 || password.length > 1024) return json({ error:"Enter a valid email, name, role, and temporary password of at least 14 characters" },400);
      if (actor.role !== "owner" && role === "admin") return json({ error:"Only the owner can create administrators" },403);
      const permissionsByRole:Record<string,string[]> = {admin:["staff.manage","staff.view","inventory.manage","inventory.view","pos.manage","pos.view","audit.view"],manager:["staff.view","inventory.view","inventory.manage","pos.view","pos.manage","audit.view"],inventory:["inventory.view","inventory.manage"],pos:["pos.view","pos.manage"],support:["staff.view"],auditor:["staff.view","inventory.view","pos.view","audit.view"]};
      const salt=randomHex(16), hashed=await passwordHash(password,salt);
      const {data:created,error}=await db.from("bigfoods_staff").insert({email,display_name:name,role,permissions:permissionsByRole[role],password_hash:hashed,password_salt:salt,is_active:true,must_change_password:true,phone:typeof body.phone==="string"?body.phone.trim()||null:null,job_title:typeof body.job_title==="string"?body.job_title.trim()||null:null,start_date:typeof body.start_date==="string"&&body.start_date?body.start_date:null,monthly_salary:body.monthly_salary===undefined||body.monthly_salary===""?null:Number(body.monthly_salary),created_by:actor.id}).select("id,email,display_name,role,permissions,is_active,must_change_password,created_at").single();
      if(error || !created) return json({error:"Unable to create staff account; email may already exist"},409);
      await db.from("bigfoods_staff_audit_events").insert({actor_staff_id:actor.id,subject_staff_id:created.id,action:"staff.create",details:{role}});
      return json({staff:created},201);
    }
    if (action === "set_active") {
      const id=typeof body.staff_id==="string"?body.staff_id:"", active=body.is_active;
      if (!id || typeof active!=="boolean") return json({error:"Invalid staff status request"},400);
      if (id===actor.id && active===false) return json({error:"You cannot deactivate your own account"},400);
      const {data:target}=await db.from("bigfoods_staff").select("id,role").eq("id",id).maybeSingle();
      if(!target) return json({error:"Staff account not found"},404);
      if(target.role==="owner" && actor.role!=="owner") return json({error:"Only the owner can change owner accounts"},403);
      const {error}=await db.from("bigfoods_staff").update({is_active:active,updated_at:new Date().toISOString()}).eq("id",id);
      if(error) return json({error:"Unable to update staff status"},503);
      if(!active) await db.from("bigfoods_staff_sessions").update({revoked_at:new Date().toISOString()}).eq("staff_id",id).is("revoked_at",null);
      await db.from("bigfoods_staff_audit_events").insert({actor_staff_id:actor.id,subject_staff_id:id,action:active?"staff.activate":"staff.deactivate"});
      return json({ok:true});
    }
    return json({error:"Unsupported action"},400);
  } catch { return json({error:"Staff service unavailable"},503); }
});