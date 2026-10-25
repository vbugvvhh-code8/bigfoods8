import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Vary": "Origin" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const enc = new TextEncoder();
const digest = async (v: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(v))), x => x.toString(16).padStart(2, "0")).join("");
type Actor = { id: string; role: string; permissions: unknown; is_active: boolean; must_change_password: boolean; is_platform_admin?: boolean };
const has = (a: Actor, permission: string) => a.is_platform_admin === true || ["owner", "admin"].includes(a.role) || a.role === "inventory" || (Array.isArray(a.permissions) && a.permissions.includes(permission));

async function actorFor(db: any, token: string, bearer: string): Promise<Actor | null> {
  if (/^[0-9a-f]{64}$/i.test(token)) {
    const { data: session } = await db.from("bigfoods_staff_sessions").select("staff_id,expires_at,revoked_at").eq("token_hash", await digest(token)).maybeSingle();
    if (session && !session.revoked_at && new Date(session.expires_at).getTime() > Date.now()) {
      const { data: staff } = await db.from("bigfoods_staff").select("id,role,permissions,is_active,must_change_password").eq("id", session.staff_id).maybeSingle();
      if (staff?.is_active) return { ...staff, is_platform_admin: false };
    }
  }
  if (bearer) {
    const { data: { user }, error } = await db.auth.getUser(bearer);
    if (!error && user) {
      const { data: profile } = await db.from("profiles").select("id,role,status,blocked").eq("id", user.id).maybeSingle();
      if (profile?.role === "admin" && profile.status === "active" && !profile.blocked) {
        const { data: staff } = await db.from("bigfoods_staff").select("id").ilike("email", user.email ?? "").maybeSingle();
        return { id: staff?.id ?? user.id, role: "admin", permissions: ["inventory.view", "inventory.manage", "inventory.receive", "inventory.reconcile"], is_active: true, must_change_password: false, is_platform_admin: true };
      }
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Inventory service unavailable" }, 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.get("Authorization") ?? "")?.[1] ?? "";
    const actor = await actorFor(db, typeof body.session_token === "string" ? body.session_token : "", bearer);
    if (!actor) return json({ error: "Unauthenticated" }, 401);
    if (actor.must_change_password) return json({ error: "Change your temporary password first" }, 403);
    const action = body.action;
    if (action === "overview") {
      if (!has(actor, "inventory.view")) return json({ error: "Forbidden" }, 403);
      const [items, batches, alerts, movements] = await Promise.all([
        db.from("inventory_items").select("id,name,sku,category,tracking_type,base_unit,reorder_level,is_perishable,is_active,created_at").order("name").limit(500),
        db.from("inventory_batches").select("id,inventory_item_id,batch_code,supplier_name,received_quantity,remaining_quantity,base_unit,unit_cost,currency,received_at,expires_at,status").order("received_at", { ascending: false }).limit(200),
        db.from("inventory_alerts").select("id,inventory_item_id,alert_type,severity,status,title,created_at").neq("status", "resolved").neq("status", "dismissed").order("created_at", { ascending: false }).limit(100),
        db.from("inventory_movements").select("id,inventory_item_id,batch_id,movement_type,quantity,direction,base_unit,reason,occurred_at,actor_staff_id").order("occurred_at", { ascending: false }).limit(50)
      ]);
      if (items.error || batches.error || alerts.error || movements.error) return json({ error: "Inventory schema is not available yet. Apply the Task 10 migrations to the test database first." }, 503);
      return json({ items: items.data ?? [], batches: batches.data ?? [], alerts: alerts.data ?? [], movements: movements.data ?? [] });
    }
    if (action === "item_create") {
      if (!has(actor, "inventory.manage")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.rpc("bigfoods_inventory_create_item", {
        p_actor_staff_id: actor.id, p_name: body.name, p_sku: body.sku ?? null, p_category: body.category ?? "ingredient",
        p_tracking_type: body.tracking_type, p_base_unit: body.base_unit, p_reorder_level: body.reorder_level ?? 0,
        p_is_perishable: body.is_perishable ?? false, p_notes: body.notes ?? null
      });
      if (error) return json({ error: error.message.includes("duplicate key") ? "That SKU is already in use." : error.message.includes("Forbidden") ? "Forbidden" : "Unable to create inventory item. Check the fields and try again." }, error.message.includes("Forbidden") ? 403 : 400);
      return json({ item: data }, 201);
    }
    if (action === "receive") {
      if (!has(actor, "inventory.receive")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.rpc("bigfoods_inventory_receive", {
        p_actor_staff_id: actor.id, p_inventory_item_id: body.inventory_item_id, p_batch_code: body.batch_code,
        p_quantity: body.quantity, p_unit: body.unit, p_supplier_name: body.supplier_name ?? null,
        p_supplier_reference: body.supplier_reference ?? null, p_unit_cost: body.unit_cost === "" || body.unit_cost == null ? null : body.unit_cost,
        p_currency: body.currency ?? "NGN", p_received_at: body.received_at ?? new Date().toISOString(),
        p_expires_at: body.expires_at || null, p_notes: body.notes ?? null
      });
      if (error) return json({ error: error.message.includes("Forbidden") ? "Forbidden" : error.message.includes("duplicate key") ? "That batch code already exists." : error.message }, error.message.includes("Forbidden") ? 403 : 400);
      return json({ receipt: data }, 201);
    }
    return json({ error: "Unknown inventory action" }, 400);
  } catch {
    return json({ error: "Inventory service unavailable" }, 503);
  }
});
