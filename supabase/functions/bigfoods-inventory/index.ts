import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Vary": "Origin" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const enc = new TextEncoder();
const digest = async (v: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(v))), x => x.toString(16).padStart(2, "0")).join("");
type Actor = { id: string; role: string; permissions: unknown; is_active: boolean; must_change_password: boolean; is_platform_admin?: boolean };
const has = (a: Actor, permission: string) => a.is_platform_admin === true || ["owner", "admin"].includes(a.role) || (a.role === "inventory" && ["inventory.view", "inventory.receive", "inventory.count", "inventory.process", "inventory.waste"].includes(permission)) || (Array.isArray(a.permissions) && a.permissions.includes(permission));

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
    if (action === "production_list") {
      if (!has(actor, "inventory.view")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.from("inventory_production_batches")
        .select("id,batch_code,input_inventory_item_id,input_batch_id,raw_input_quantity,raw_input_unit,output_inventory_item_id,output_quantity,output_unit,unprocessed_quantity,allowed_loss_quantity,actual_loss_quantity,variance_quantity,status,started_at,finished_at")
        .order("started_at", { ascending: false }).limit(100);
      if (error) return json({ error: "Unable to load production batches." }, 503);
      return json({ production: data ?? [] });
    }
    if (action === "waste") {
      if (!has(actor, "inventory.waste")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.rpc("bigfoods_inventory_log_waste", {
        p_actor_staff_id: actor.id, p_batch_id: body.batch_id, p_quantity: body.quantity, p_reason: body.reason
      });
      if (error) return json({ error: error.message.includes("Forbidden") ? "Forbidden" : error.message }, error.message.includes("Forbidden") ? 403 : 400);
      return json({ waste: data }, 201);
    }
    if (action === "recipe_overview") {
      if (!has(actor, "inventory.view")) return json({ error: "Forbidden" }, 403);
      const [menu, recipes] = await Promise.all([
        db.from("menu_items").select("id,name").order("name").limit(500),
        db.from("inventory_recipes").select("id,menu_item_id,name,version,output_quantity,output_unit,effective_from,is_active").eq("is_active", true).order("name").limit(300)
      ]);
      if (menu.error || recipes.error) return json({ error: "Unable to load recipe data. Confirm the inventory migrations have been applied." }, 503);
      return json({ menu_items: menu.data ?? [], recipes: recipes.data ?? [] });
    }
    if (action === "recipe_save") {
      if (!has(actor, "inventory.manage")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.rpc("bigfoods_inventory_save_recipe", {
        p_actor_staff_id: actor.id, p_menu_item_id: body.menu_item_id, p_name: body.name,
        p_output_quantity: body.output_quantity, p_output_unit: body.output_unit, p_ingredients: body.ingredients
      });
      if (error) return json({ error: error.message.includes("Forbidden") ? "Forbidden" : error.message }, error.message.includes("Forbidden") ? 403 : 400);
      return json({ recipe: data }, 201);
    }
    if (action === "production_start") {
      if (!has(actor, "inventory.process")) return json({ error: "Forbidden" }, 403);
      const rawQty = Number(body.raw_input_quantity), allowedLoss = Number(body.allowed_loss_quantity ?? 0);
      if (!body.batch_code || !body.input_inventory_item_id || !body.input_batch_id || !body.output_inventory_item_id ||
          !Number.isFinite(rawQty) || rawQty <= 0 || !Number.isFinite(allowedLoss) || allowedLoss < 0) {
        return json({ error: "Complete the production batch details with valid quantities." }, 400);
      }
      const { data: source, error: sourceError } = await db.from("inventory_batches").select("id,inventory_item_id,remaining_quantity,base_unit,status").eq("id", body.input_batch_id).maybeSingle();
      if (sourceError || !source || source.status !== "active" || source.inventory_item_id !== body.input_inventory_item_id || Number(source.remaining_quantity) < rawQty) {
        return json({ error: "The selected source batch is unavailable or has insufficient stock." }, 400);
      }
      const { data: output, error: outputError } = await db.from("inventory_items").select("id,base_unit,is_active").eq("id", body.output_inventory_item_id).maybeSingle();
      if (outputError || !output || !output.is_active) return json({ error: "Select an active output inventory item." }, 400);
      if (String(output.base_unit).trim().toLowerCase() !== String(source.base_unit).trim().toLowerCase()) {
        return json({ error: "For yield variance tracking, raw input and output must use the same base unit." }, 400);
      }
      const { data, error } = await db.from("inventory_production_batches").insert({
        batch_code: String(body.batch_code).trim(), input_inventory_item_id: body.input_inventory_item_id,
        input_batch_id: body.input_batch_id, raw_input_quantity: rawQty, raw_input_unit: source.base_unit,
        output_inventory_item_id: body.output_inventory_item_id, output_unit: output.base_unit,
        unprocessed_quantity: 0, allowed_loss_quantity: allowedLoss, status: "in_progress", started_by_staff_id: actor.id
      }).select("id,batch_code,status,raw_input_quantity,raw_input_unit,allowed_loss_quantity").single();
      if (error) return json({ error: error.message.includes("duplicate key") ? "That production batch code already exists." : "Unable to start production batch." }, 400);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "inventory.production_started", details: { production_batch_id: data.id, batch_code: data.batch_code, raw_input_quantity: rawQty } });
      return json({ production: data }, 201);
    }
    if (action === "production_finish") {
      if (!has(actor, "inventory.process")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.rpc("bigfoods_inventory_finish_production", {
        p_actor_staff_id: actor.id, p_batch_id: body.production_batch_id,
        p_output_quantity: body.output_quantity, p_unprocessed_quantity: body.unprocessed_quantity,
        p_actual_loss_quantity: body.actual_loss_quantity, p_review_note: body.review_note ?? null
      });
      if (error) return json({ error: error.message.includes("Forbidden") ? "Forbidden" : error.message }, error.message.includes("Forbidden") ? 403 : 400);
      return json({ production: data }, 200);
    }
    return json({ error: "Unknown inventory action" }, 400);
  } catch {
    return json({ error: "Inventory service unavailable" }, 503);
  }
});
