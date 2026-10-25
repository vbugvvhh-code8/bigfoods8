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
    if (action === "pos_item_photo_upload") {
      if (!has(actor, "inventory.manage")) return json({ error: "Forbidden" }, 403);
      const encoded = String(body.image_base64 ?? "");
      if (!encoded || encoded.length > 500000 || !encoded.startsWith("data:image/jpeg;base64,")) {
        return json({ error: "Choose a compressed JPEG photo under the allowed size." }, 400);
      }
      const raw = encoded.slice("data:image/jpeg;base64,".length);
      const binary = atob(raw);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      if (bytes.byteLength > 350000) return json({ error: "Photo is too large after compression. Choose a smaller image." }, 400);
      const path = `bigfoods/pos/${crypto.randomUUID()}.jpg`;
      const { error } = await db.storage.from("menu-images").upload(path, bytes, { contentType: "image/jpeg", upsert: false });
      if (error) return json({ error: "Unable to upload this photo. Please try again." }, 400);
      const { data } = db.storage.from("menu-images").getPublicUrl(path);
      return json({ path, url: data.publicUrl }, 201);
    }
    if (action === "pos_item_photo_delete") {
      if (!has(actor, "inventory.manage")) return json({ error: "Forbidden" }, 403);
      const paths = Array.isArray(body.paths) ? body.paths.map((v: unknown) => String(v)).filter((v: string) => v.startsWith("bigfoods/pos/") && !v.includes("..")) : [];
      if (paths.length) {
        const { error } = await db.storage.from("menu-images").remove(paths);
        if (error) return json({ error: "Item saved, but a removed photo could not be deleted from storage." }, 400);
      }
      return json({ success: true });
    }
    if (action === "pos_catalogue_overview") {
      const posViewer = ["owner", "admin", "cashier", "pos"].includes(actor.role) || has(actor, "pos.view") || has(actor, "pos.sell");
      if (!posViewer) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.from("bigfoods_pos_items")
        .select("id,name,sku,description,category,subcategory,selling_price,image_url,image_urls,is_available,sort_order,ingredients,serving_size,preparation_time_minutes,stock_quantity,availability_schedule_enabled,availability_schedule,allergens,dietary_tags,promotional_price,promotion_starts_at,promotion_ends_at,complementary_item_ids,option_groups,created_at,updated_at")
        .order("sort_order").order("name").limit(1000);
      if (error) return json({ error: "Unable to load the BigFoods POS catalogue. Apply the POS catalogue migration." }, 503);
      return json({ items: data ?? [] });
    }
    if (action === "pos_sale_create") {
      if (!(has(actor, "pos.sell") || ["owner", "admin", "cashier", "pos"].includes(actor.role))) return json({ error: "Your account cannot record POS sales." }, 403);
      const lines = Array.isArray(body.items) ? body.items : [];
      const paymentMethod = body.payment_method;
      const idempotencyKey = String(body.idempotency_key ?? "");
      const customerEmail = typeof body.customer_email === "string" ? body.customer_email.trim().toLowerCase() : "";
      const cashReceived = paymentMethod === "cash" ? Number(body.cash_received) : null;
      if (!lines.length || lines.length > 100 || !/^[0-9a-f-]{36}$/i.test(idempotencyKey)) return json({ error: "Order items or checkout reference are invalid." }, 400);
      if (!["cash", "moniepoint_pos"].includes(paymentMethod)) return json({ error: "Choose cash or physical Moniepoint POS." }, 400);
      if (paymentMethod === "moniepoint_pos" && body.terminal_confirmed !== true) return json({ error: "Confirm the physical Moniepoint terminal succeeded before recording the sale." }, 400);
      if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) return json({ error: "Enter a valid customer email." }, 400);
      const quantities = new Map<string, number>();
      for (const line of lines) {
        const id = String(line.product_id ?? "");
        const qty = Number(line.quantity);
        if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isSafeInteger(qty) || qty < 1 || qty > 999) return json({ error: "One or more order quantities are invalid." }, 400);
        quantities.set(id, (quantities.get(id) ?? 0) + qty);
      }
      const { data: products, error: productError } = await db.from("bigfoods_pos_items").select("id,name,selling_price,promotional_price,promotion_starts_at,promotion_ends_at,is_available").in("id", [...quantities.keys()]);
      if (productError || !products || products.length !== quantities.size || products.some((p: any) => !p.is_available)) return json({ error: "One or more items are unavailable. Refresh the menu and try again." }, 409);
      const productById = new Map(products.map((p: any) => [p.id, p]));
      const now = Date.now();
      const salePrice = (p: any) => { const starts = p.promotion_starts_at ? new Date(p.promotion_starts_at).getTime() : null; const ends = p.promotion_ends_at ? new Date(p.promotion_ends_at).getTime() : null; return p.promotional_price != null && (!starts || starts <= now) && (!ends || ends >= now) && Number(p.promotional_price) > 0 && Number(p.promotional_price) < Number(p.selling_price) ? Number(p.promotional_price) : Number(p.selling_price); };
      const total = [...quantities.entries()].reduce((sum, [id, qty]) => sum + salePrice(productById.get(id)) * qty, 0);
      if (paymentMethod === "cash" && (!Number.isFinite(cashReceived) || cashReceived! < total)) return json({ error: "Cash received must be at least the order total." }, 400);
      const { data: existing } = await db.from("bigfoods_pos_sales").select("id,receipt_number,total_amount,payment_method,status,cash_received,change_due,created_at").eq("idempotency_key", idempotencyKey).maybeSingle();
      if (existing) return json({ sale: existing, duplicate: true });
      const receiptNumber = "BF-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + crypto.randomUUID().slice(0,8).toUpperCase();
      const { data: sale, error: saleError } = await db.from("bigfoods_pos_sales").insert({
        receipt_number: receiptNumber, idempotency_key: idempotencyKey, cashier_staff_id: actor.id,
        customer_email: customerEmail || null, payment_method: paymentMethod, status: "paid",
        subtotal: total, total_amount: total, cash_received: paymentMethod === "cash" ? cashReceived : null,
        change_due: paymentMethod === "cash" ? cashReceived! - total : 0,
        payment_note: paymentMethod === "moniepoint_pos" ? "Physical Moniepoint terminal success confirmed by cashier" : null
      }).select("id,receipt_number,total_amount,payment_method,status,cash_received,change_due,created_at").single();
      if (saleError || !sale) return json({ error: saleError?.code === "23505" ? "This checkout was already submitted. Refresh the sales screen." : "Unable to save this sale. No receipt was issued." }, 409);
      const saleLines = [...quantities.entries()].map(([id, quantity]) => {
        const p = productById.get(id) as any;
        return { sale_id: sale.id, product_id: id, product_name: p.name, quantity, unit_price: salePrice(p), line_total: salePrice(p) * quantity };
      });
      const { error: lineError } = await db.from("bigfoods_pos_sale_items").insert(saleLines);
      if (lineError) {
        await db.from("bigfoods_pos_sales").update({ status: "needs_review" }).eq("id", sale.id);
        return json({ error: "Sale was recorded but its items need administrator review. Do not charge the customer again; contact an administrator." }, 503);
      }
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.sale_recorded", details: { sale_id: sale.id, receipt_number: sale.receipt_number, payment_method: paymentMethod, total_amount: total, item_count: saleLines.length } });
      return json({ sale, items: saleLines }, 201);
    }
    if (action === "pos_item_save") {
      if (!has(actor, "inventory.manage")) return json({ error: "Forbidden" }, 403);
      const name = String(body.name ?? "").trim();
      const category = String(body.category ?? "").trim();
      const price = Number(body.selling_price);
      if (!name || !category || !Number.isFinite(price) || price < 0) return json({ error: "Name, category and a valid non-negative selling price are required." }, 400);
      const promoPrice = body.promotional_price == null || body.promotional_price === "" ? null : Number(body.promotional_price);
      const preparationMinutes = body.preparation_time_minutes == null || body.preparation_time_minutes === "" ? null : Number(body.preparation_time_minutes);
      const stockQuantity = body.stock_quantity == null || body.stock_quantity === "" ? null : Number(body.stock_quantity);
      if (promoPrice !== null && (!Number.isSafeInteger(promoPrice) || promoPrice <= 0 || promoPrice >= price)) return json({ error: "Promotional price must be a whole number above zero and below the selling price." }, 400);
      if (preparationMinutes !== null && (!Number.isSafeInteger(preparationMinutes) || preparationMinutes <= 0)) return json({ error: "Preparation time must be a positive whole number." }, 400);
      if (stockQuantity !== null && (!Number.isSafeInteger(stockQuantity) || stockQuantity < 0)) return json({ error: "Stock quantity must be a non-negative whole number." }, 400);
      const payload = {
        name, sku: String(body.sku ?? "").trim() || (body.id ? undefined : `BF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`), description: String(body.description ?? "").trim() || null,
        category, subcategory: String(body.subcategory ?? "").trim() || null,
        selling_price: price, image_url: String(body.image_url ?? "").trim() || null,
        image_urls: Array.isArray(body.image_urls) ? body.image_urls.map((v: unknown) => String(v)).slice(0, 3) : [],
        ingredients: String(body.ingredients ?? "").trim() || null,
        serving_size: String(body.serving_size ?? "").trim() || null,
        preparation_time_minutes: preparationMinutes,
        stock_quantity: stockQuantity,
        availability_schedule_enabled: body.availability_schedule_enabled === true,
        availability_schedule: Array.isArray(body.availability_schedule) ? body.availability_schedule : [],
        allergens: Array.isArray(body.allergens) ? body.allergens.map((v: unknown) => String(v).trim()).filter(Boolean) : [],
        dietary_tags: Array.isArray(body.dietary_tags) ? body.dietary_tags.map((v: unknown) => String(v).trim()).filter(Boolean) : [],
        promotional_price: promoPrice,
        promotion_starts_at: body.promotion_starts_at || null,
        promotion_ends_at: body.promotion_ends_at || null,
        complementary_item_ids: Array.isArray(body.complementary_item_ids) ? body.complementary_item_ids : [],
        option_groups: Array.isArray(body.option_groups) ? body.option_groups : [],
        is_available: body.is_available !== false, sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
        updated_by_staff_id: actor.id, updated_at: new Date().toISOString()
      };
      let result;
      if (body.id) {
        result = await db.from("bigfoods_pos_items").update(payload).eq("id", body.id)
          .select("id,name,sku,description,category,subcategory,selling_price,image_url,image_urls,is_available,sort_order,ingredients,serving_size,preparation_time_minutes,stock_quantity,availability_schedule_enabled,availability_schedule,allergens,dietary_tags,promotional_price,promotion_starts_at,promotion_ends_at,complementary_item_ids,option_groups").single();
      } else {
        result = await db.from("bigfoods_pos_items").insert({ ...payload, created_by_staff_id: actor.id })
          .select("id,name,sku,description,category,subcategory,selling_price,image_url,image_urls,is_available,sort_order,ingredients,serving_size,preparation_time_minutes,stock_quantity,availability_schedule_enabled,availability_schedule,allergens,dietary_tags,promotional_price,promotion_starts_at,promotion_ends_at,complementary_item_ids,option_groups").single();
      }
      if (result.error) return json({ error: result.error.message.includes("duplicate key") ? "That SKU is already in use." : "Unable to save catalogue item. Check the details and try again." }, 400);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: body.id ? "pos.catalogue_item_updated" : "pos.catalogue_item_created", details: { item_id: result.data.id, name } });
      return json({ item: result.data }, body.id ? 200 : 201);
    }
    if (action === "pos_item_availability") {
      if (!has(actor, "inventory.manage")) return json({ error: "Forbidden" }, 403);
      if (!body.id || typeof body.is_available !== "boolean") return json({ error: "Catalogue item and availability are required." }, 400);
      const { data, error } = await db.from("bigfoods_pos_items").update({ is_available: body.is_available, updated_by_staff_id: actor.id, updated_at: new Date().toISOString() })
        .eq("id", body.id).select("id,name,is_available").single();
      if (error) return json({ error: "Unable to update item availability." }, 400);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.catalogue_availability_changed", details: { item_id: data.id, is_available: data.is_available } });
      return json({ item: data });
    }
    if (action === "recipe_overview") {
      if (!has(actor, "inventory.view")) return json({ error: "Forbidden" }, 403);
      const [items, recipes] = await Promise.all([
        db.from("bigfoods_pos_items").select("id,name,category,is_available").order("name").limit(1000),
        db.from("inventory_recipes").select("id,bigfoods_pos_item_id,name,version,output_quantity,output_unit,effective_from,is_active").eq("is_active", true).not("bigfoods_pos_item_id", "is", null).order("name").limit(300)
      ]);
      if (items.error || recipes.error) return json({ error: "Unable to load in-house recipe data. Confirm the POS catalogue migrations have been applied." }, 503);
      return json({ pos_items: items.data ?? [], recipes: recipes.data ?? [] });
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
