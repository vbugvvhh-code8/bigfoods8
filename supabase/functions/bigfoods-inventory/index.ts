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
        db.from("inventory_items").select("id,name,sku,category,tracking_type,base_unit,reorder_level,is_perishable,is_active,image_url,created_at").order("name").limit(500),
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
      const itemId = typeof data === "string" ? data : data?.id;
      if (itemId && typeof body.image_url === "string") { const { error: imageError } = await db.from("inventory_items").update({ image_url: body.image_url.trim() || null }).eq("id", itemId); if (imageError) return json({ error: "Item was created, but its image could not be saved. Edit the item and retry." }, 500); }
      return json({ item: data }, 201);
    }
    if (action === "item_update") {
      if (!has(actor, "inventory.manage")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.rpc("bigfoods_inventory_update_item", {
        p_actor_staff_id: actor.id, p_inventory_item_id: body.inventory_item_id, p_name: body.name,
        p_sku: body.sku ?? null, p_category: body.category ?? "ingredient", p_tracking_type: body.tracking_type,
        p_base_unit: body.base_unit, p_reorder_level: body.reorder_level ?? 0,
        p_is_perishable: body.is_perishable ?? false, p_notes: body.notes ?? null
      });
      if (error) return json({ error: error.message.includes("Forbidden") ? "Forbidden" : error.message }, error.message.includes("Forbidden") ? 403 : 400);
      if (typeof body.image_url === "string") { const { error: imageError } = await db.from("inventory_items").update({ image_url: body.image_url.trim() || null }).eq("id", body.inventory_item_id); if (imageError) return json({ error: "Item details were saved, but its image could not be saved." }, 500); }
      return json({ item: data });
    }
    if (action === "adjust_batch") {
      if (!has(actor, "inventory.receive")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.rpc("bigfoods_inventory_adjust_batch", {
        p_actor_staff_id: actor.id, p_batch_id: body.batch_id, p_quantity: body.quantity,
        p_direction: body.direction, p_reason: body.reason
      });
      if (error) return json({ error: error.message.includes("Forbidden") ? "Forbidden" : error.message }, error.message.includes("Forbidden") ? 403 : 400);
      return json({ adjustment: data }, 201);
    }
    if (action === "receive") {
      if (!has(actor, "inventory.receive")) return json({ error: "Forbidden" }, 403);
      const { data: generatedCode, error: codeError } = await db.rpc("bigfoods_inventory_next_batch_code", { p_kind: "receipt" });
      if (codeError || !generatedCode) return json({ error: "Unable to generate a stock batch code. Please retry." }, 503);
      const { data, error } = await db.rpc("bigfoods_inventory_receive", {
        p_actor_staff_id: actor.id, p_inventory_item_id: body.inventory_item_id, p_batch_code: generatedCode,
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
    if (action === "waste_history") {
      if (!has(actor, "inventory.view")) return json({ error: "Forbidden" }, 403);
      const [raw, menu] = await Promise.all([
        db.from("inventory_movements").select("id,inventory_item_id,batch_id,quantity,base_unit,reason,occurred_at,actor_staff_id").eq("movement_type", "waste").order("occurred_at", { ascending: false }).limit(100),
        db.from("bigfoods_pos_menu_waste").select("id,pos_item_id,quantity,stock_before,stock_after,reason,created_at,actor_staff_id").order("created_at", { ascending: false }).limit(100)
      ]);
      if (raw.error || menu.error) {
        console.error("Waste history query failed", raw.error?.message, menu.error?.message);
        return json({ error: "Unable to load waste history." }, 503);
      }
      const rawRows = raw.data ?? [], menuRows = menu.data ?? [];
      const itemIds = [...new Set(rawRows.map((r: any) => r.inventory_item_id).filter(Boolean))];
      const batchIds = [...new Set(rawRows.map((r: any) => r.batch_id).filter(Boolean))];
      const posIds = [...new Set(menuRows.map((r: any) => r.pos_item_id).filter(Boolean))];
      const staffIds = [...new Set([...rawRows, ...menuRows].map((r: any) => r.actor_staff_id).filter(Boolean))];
      const [rawItems, batches, posItems, staff] = await Promise.all([
        itemIds.length ? db.from("inventory_items").select("id,name").in("id", itemIds) : Promise.resolve({ data: [], error: null }),
        batchIds.length ? db.from("inventory_batches").select("id,batch_code").in("id", batchIds) : Promise.resolve({ data: [], error: null }),
        posIds.length ? db.from("bigfoods_pos_items").select("id,name").in("id", posIds) : Promise.resolve({ data: [], error: null }),
        staffIds.length ? db.from("bigfoods_staff").select("id,display_name").in("id", staffIds) : Promise.resolve({ data: [], error: null })
      ]);
      if (rawItems.error || batches.error || posItems.error || staff.error) {
        console.error("Waste history lookup failed", rawItems.error?.message, batches.error?.message, posItems.error?.message, staff.error?.message);
        return json({ error: "Unable to load waste history details." }, 503);
      }
      const rawItemMap = new Map((rawItems.data ?? []).map((r: any) => [r.id, r.name]));
      const batchMap = new Map((batches.data ?? []).map((r: any) => [r.id, r.batch_code]));
      const posMap = new Map((posItems.data ?? []).map((r: any) => [r.id, r.name]));
      const staffMap = new Map((staff.data ?? []).map((r: any) => [r.id, r.display_name]));
      const records = [
        ...rawRows.map((r: any) => ({ id: r.id, stock_type: "raw", item_name: rawItemMap.get(r.inventory_item_id) ?? "Inventory item", batch_code: batchMap.get(r.batch_id) ?? null, quantity: Number(r.quantity), unit: r.base_unit, reason: r.reason, occurred_at: r.occurred_at, staff_name: staffMap.get(r.actor_staff_id) ?? "Staff" })),
        ...menuRows.map((r: any) => ({ id: r.id, stock_type: "menu", item_name: posMap.get(r.pos_item_id) ?? "Menu item", batch_code: null, quantity: Number(r.quantity), unit: "portion(s)", stock_before: r.stock_before, stock_after: r.stock_after, reason: r.reason, occurred_at: r.created_at, staff_name: staffMap.get(r.actor_staff_id) ?? "Staff" }))
      ].sort((a: any, b: any) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()).slice(0, 100);
      return json({ records });
    }
    if (action === "menu_waste") {
      if (!has(actor, "inventory.waste")) return json({ error: "Forbidden" }, 403);
      const quantity = Number(body.quantity);
      if (!body.pos_item_id || !Number.isSafeInteger(quantity) || quantity <= 0 || typeof body.reason !== "string" || body.reason.trim().length < 3) {
        return json({ error: "Choose a menu item and enter a whole-number quantity and reason." }, 400);
      }
      const { data, error } = await db.rpc("bigfoods_inventory_log_menu_waste", {
        p_actor_staff_id: actor.id, p_pos_item_id: body.pos_item_id, p_quantity: quantity, p_reason: body.reason.trim()
      });
      if (error) return json({ error: error.message.includes("Forbidden") ? "Forbidden" : error.message }, error.message.includes("Forbidden") ? 403 : 400);
      return json({ waste: data }, 201);
    }
    if (action === "recipe_overview") {
      if (!has(actor, "inventory.view")) return json({ error: "Forbidden" }, 403);
      const [items, recipes] = await Promise.all([
        db.from("bigfoods_pos_items").select("id,name,category,is_available,stock_quantity,track_stock").order("name").limit(1000),
        db.from("inventory_recipes").select("id,bigfoods_pos_item_id,name,version,output_quantity,output_unit,effective_from,is_active").eq("is_active", true).not("bigfoods_pos_item_id", "is", null).order("name").limit(300)
      ]);
      if (items.error || recipes.error) return json({ error: "Unable to load in-house recipe data. Confirm the POS catalogue migrations have been applied." }, 503);
      return json({ pos_items: items.data ?? [], recipes: recipes.data ?? [] });
    }
    if (action === "recipe_history") {
      if (!has(actor, "inventory.view")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.from("inventory_recipes")
        .select("id,bigfoods_pos_item_id,name,version,output_quantity,output_unit,effective_from,effective_until,is_active,created_at,inventory_recipe_items(inventory_item_id,quantity,unit,notes,inventory_items(name,base_unit))")
        .not("bigfoods_pos_item_id", "is", null).order("name").order("version", { ascending: false }).limit(1000);
      if (error) return json({ error: "Unable to load recipe version history." }, 503);
      return json({ recipes: data ?? [] });
    }
    if (action === "recipe_retire") {
      if (!has(actor, "inventory.manage")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.rpc("bigfoods_inventory_retire_recipe", { p_actor_staff_id: actor.id, p_recipe_id: body.recipe_id });
      if (error) return json({ error: error.message.includes("Forbidden") ? "Forbidden" : error.message }, error.message.includes("Forbidden") ? 403 : 400);
      return json({ recipe: data });
    }
    if (action === "recipe_delete") {
      if (!has(actor, "inventory.manage")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.rpc("bigfoods_inventory_delete_unused_recipe", { p_actor_staff_id: actor.id, p_recipe_id: body.recipe_id });
      if (error) return json({ error: error.message.includes("Forbidden") ? "Forbidden" : error.message }, error.message.includes("Forbidden") ? 403 : 400);
      return json({ recipe: data });
    }
    if (action === "kitchen_overview") {
      if (!has(actor, "inventory.view")) return json({ error: "Forbidden" }, 403);
      const [items, batches, recipes] = await Promise.all([
        db.from("inventory_items").select("id,name,base_unit,reorder_level,is_active").eq("is_active", true).order("name").limit(500),
        db.from("inventory_batches").select("inventory_item_id,remaining_quantity,status,expires_at").eq("status", "active").gt("remaining_quantity", 0).limit(2000),
        db.from("inventory_recipes").select("id,bigfoods_pos_item_id,name,version,output_quantity,output_unit,bigfoods_pos_items(name),inventory_recipe_items(inventory_item_id,quantity,unit,inventory_items(id,name,base_unit))").eq("is_active", true).not("bigfoods_pos_item_id", "is", null).order("name").limit(500)
      ]);
      if (items.error || batches.error || recipes.error) return json({ error: "Unable to load kitchen planning data. Check that inventory recipes are configured." }, 503);
      return json({ items: items.data ?? [], batches: batches.data ?? [], recipes: recipes.data ?? [] });
    }
    if (action === "kitchen_queue") {
      if (!has(actor, "inventory.view")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.from("inventory_kitchen_preparations").select("id,prep_code,recipe_name,recipe_version,bigfoods_pos_item_id,requested_portions,status,ingredient_snapshot,requested_at,started_at,completed_at,notes,bigfoods_pos_items(name)").order("requested_at", { ascending: false }).limit(150);
      if (error) return json({ error: "Unable to load kitchen preparation queue." }, 503);
      return json({ preparations: data ?? [] });
    }
    if (action === "kitchen_create") {
      if (!has(actor, "inventory.process")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.rpc("bigfoods_kitchen_create_preparation", { p_actor_staff_id: actor.id, p_recipe_id: body.recipe_id, p_portions: body.portions, p_notes: body.notes ?? null });
      if (error) return json({ error: error.message.includes("Forbidden") ? "Forbidden" : error.message }, error.message.includes("Forbidden") ? 403 : 400);
      return json({ preparation: data }, 201);
    }
    if (action === "kitchen_start") {
      if (!has(actor, "inventory.process")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.rpc("bigfoods_kitchen_start_preparation", { p_actor_staff_id: actor.id, p_preparation_id: body.preparation_id });
      if (error) return json({ error: error.message.includes("Forbidden") ? "Forbidden" : error.message }, error.message.includes("Forbidden") ? 403 : 400);
      return json({ preparation: data });
    }
    if (action === "kitchen_finish") {
      if (!has(actor, "inventory.process")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.rpc("bigfoods_kitchen_finish_preparation", { p_actor_staff_id: actor.id, p_preparation_id: body.preparation_id, p_notes: body.notes ?? null });
      if (error) return json({ error: error.message.includes("Forbidden") ? "Forbidden" : error.message }, error.message.includes("Forbidden") ? 403 : 400);
      return json({ preparation: data });
    }
    if (action === "kitchen_cancel") {
      if (!has(actor, "inventory.process")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.rpc("bigfoods_kitchen_cancel_preparation", {
        p_actor_staff_id: actor.id, p_preparation_id: body.preparation_id, p_reason: body.reason ?? null
      });
      if (error) return json({ error: error.message.includes("Forbidden") ? "Forbidden" : error.message }, error.message.includes("Forbidden") ? 403 : 400);
      return json({ preparation: data });
    }
    if (action === "recipe_save") {
      if (!has(actor, "inventory.manage")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.rpc("bigfoods_inventory_save_inhouse_recipe", {
        p_actor_staff_id: actor.id, p_bigfoods_pos_item_id: body.bigfoods_pos_item_id, p_name: body.name,
        p_output_quantity: body.output_quantity, p_output_unit: body.output_unit, p_ingredients: body.ingredients
      });
      if (error) return json({ error: error.message.includes("Forbidden") ? "Forbidden" : error.message }, error.message.includes("Forbidden") ? 403 : 400);
      return json({ recipe: data }, 201);
    }
    if (action === "production_start") {
      if (!has(actor, "inventory.process")) return json({ error: "Forbidden" }, 403);
      const rawQty = Number(body.raw_input_quantity), allowedLoss = Number(body.allowed_loss_quantity ?? 0);
      if (!body.input_inventory_item_id || !body.input_batch_id || !body.output_inventory_item_id ||
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
      const { data: generatedCode, error: codeError } = await db.rpc("bigfoods_inventory_next_batch_code", { p_kind: "kitchen" });
      if (codeError || !generatedCode) return json({ error: "Unable to generate a production batch code. Please retry." }, 503);
      const { data, error } = await db.from("inventory_production_batches").insert({
        batch_code: generatedCode, input_inventory_item_id: body.input_inventory_item_id,
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
    if (action === "branch_catalogue") {
      if (!has(actor, "inventory.view")) return json({ error: "Forbidden" }, 403);
      const [branches, items, branchItems, stock] = await Promise.all([
        db.from("bigfoods_staff_work_locations").select("id,name,branch_code,is_active").eq("is_active", true).order("name"),
        db.from("bigfoods_pos_items").select("id,name,sku,category,selling_price,is_available,track_stock,stock_quantity,low_stock_alert").order("category").order("name").limit(1000),
        db.from("bigfoods_pos_branch_items").select("id,work_location_id,pos_item_id,is_available,selling_price,sort_order").limit(5000),
        db.from("bigfoods_pos_branch_menu_stock").select("work_location_id,pos_item_id,track_stock,stock_quantity,low_stock_alert,updated_at").limit(5000)
      ]);
      if (branches.error || items.error || branchItems.error || stock.error) return json({ error: "Branch catalogue schema is unavailable. Apply the latest branch inventory migration." }, 503);
      return json({ branches: branches.data ?? [], items: items.data ?? [], branch_items: branchItems.data ?? [], branch_stock: stock.data ?? [] });
    }
    if (action === "branch_item_save") {
      if (!has(actor, "inventory.process")) return json({ error: "Forbidden" }, 403);
      const branchId = typeof body.work_location_id === "string" ? body.work_location_id : "";
      const itemId = typeof body.pos_item_id === "string" ? body.pos_item_id : "";
      const price = body.selling_price === "" || body.selling_price == null ? null : Number(body.selling_price);
      const sortOrder = Number(body.sort_order ?? 0);
      if (!branchId || !itemId || (price !== null && (!Number.isFinite(price) || price < 0)) || !Number.isInteger(sortOrder)) return json({ error: "Choose a branch and POS item, and provide a valid optional price." }, 400);
      const [{ data: branchRow }, { data: itemRow }] = await Promise.all([
        db.from("bigfoods_staff_work_locations").select("id,is_active").eq("id", branchId).maybeSingle(),
        db.from("bigfoods_pos_items").select("id").eq("id", itemId).maybeSingle()
      ]);
      if (!branchRow?.is_active || !itemRow) return json({ error: "Choose an active branch and an existing POS item." }, 400);
      const { data, error } = await db.from("bigfoods_pos_branch_items").upsert({
        work_location_id: branchId, pos_item_id: itemId, is_available: body.is_available !== false,
        selling_price: price, sort_order: sortOrder, updated_by_staff_id: actor.id, updated_at: new Date().toISOString()
      }, { onConflict: "work_location_id,pos_item_id" }).select("*").single();
      if (error) return json({ error: "Unable to save branch catalogue item." }, 400);
      return json({ branch_item: data });
    }
    if (action === "branch_stock_save") {
      if (!has(actor, "inventory.process")) return json({ error: "Forbidden" }, 403);
      const branchId = typeof body.work_location_id === "string" ? body.work_location_id : "";
      const itemId = typeof body.pos_item_id === "string" ? body.pos_item_id : "";
      const quantity = Number(body.stock_quantity), low = Number(body.low_stock_alert ?? 10);
      if (!branchId || !itemId || !Number.isSafeInteger(quantity) || quantity < 0 || !Number.isSafeInteger(low) || low < 0) return json({ error: "Enter a branch, POS item and valid whole-number stock levels." }, 400);
      const { data: branchItem } = await db.from("bigfoods_pos_branch_items").select("id").eq("work_location_id", branchId).eq("pos_item_id", itemId).maybeSingle();
      if (!branchItem) return json({ error: "Add this item to the branch catalogue before setting its stock." }, 409);
      const { data, error } = await db.from("bigfoods_pos_branch_menu_stock").upsert({
        work_location_id: branchId, pos_item_id: itemId, track_stock: body.track_stock !== false,
        stock_quantity: quantity, low_stock_alert: low, updated_by_staff_id: actor.id, updated_at: new Date().toISOString()
      }, { onConflict: "work_location_id,pos_item_id" }).select("*").single();
      if (error) return json({ error: "Unable to save branch menu stock." }, 400);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "inventory.branch_menu_stock_updated", details: { work_location_id: branchId, pos_item_id: itemId, stock_quantity: quantity, track_stock: body.track_stock !== false } });
      return json({ stock: data });
    }
    return json({ error: "Unknown inventory action" }, 400);
  } catch {
    return json({ error: "Inventory service unavailable" }, 503);
  }
});
