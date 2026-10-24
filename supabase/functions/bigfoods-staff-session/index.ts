import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const origin = Deno.env.get("STAFF_LOGIN_ALLOWED_ORIGIN") ?? "https://bigfoods.com";
const headers = { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Vary": "Origin" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } });
async function hash(value: string) { const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))); return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""); }
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const reqOrigin = req.headers.get("Origin");
  if (reqOrigin && reqOrigin !== origin) return json({ error: "Not allowed" }, 403);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const token = typeof body.token === "string" ? body.token : "";
  const action = body.action === "logout" ? "logout" : "validate";
  if (!/^[0-9a-f]{64}$/i.test(token)) return json({ error: "Unauthenticated" }, 401);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Session service unavailable" }, 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const tokenHash = await hash(token);
    const { data: session } = await db.from("bigfoods_staff_sessions").select("id,staff_id,expires_at,revoked_at").eq("token_hash", tokenHash).maybeSingle();
    if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) return json({ error: "Unauthenticated" }, 401);
    if (action === "logout") {
      await db.from("bigfoods_staff_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", session.id);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: session.staff_id, action: "staff.logout" });
      return json({ ok: true });
    }
    const { data: staff } = await db.from("bigfoods_staff").select("id,email,display_name,role,permissions,is_active,must_change_password").eq("id", session.staff_id).maybeSingle();
    if (!staff || !staff.is_active) {
      await db.from("bigfoods_staff_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", session.id);
      return json({ error: "Unauthenticated" }, 401);
    }
    await db.from("bigfoods_staff_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", session.id);
    return json({ staff: { id: staff.id, email: staff.email, display_name: staff.display_name, role: staff.role, permissions: staff.permissions, must_change_password: staff.must_change_password } });
  } catch { return json({ error: "Session service unavailable" }, 503); }
});