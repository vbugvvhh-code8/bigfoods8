import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Vary": "Origin" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const sha256 = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), b => b.toString(16).padStart(2, "0")).join("");
type Actor = { id: string; role: string; permissions: unknown; must_change_password: boolean };
const permissions = (actor: Actor) => Array.isArray(actor.permissions) ? actor.permissions.filter((x): x is string => typeof x === "string") : [];
const allowed = (actor: Actor, permission: string) => ["owner", "admin"].includes(actor.role) || permissions(actor).includes("pos.access") && permissions(actor).includes(permission);
const money = (value: unknown) => Number.isFinite(Number(value)) && Number(value) >= 0;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const token = typeof body.session_token === "string" ? body.session_token : "";
  if (!/^[0-9a-f]{64}$/i.test(token)) return json({ error: "Unauthenticated" }, 401);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "POS service unavailable" }, 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: session } = await db.from("bigfoods_staff_sessions").select("id,staff_id,expires_at,revoked_at").eq("token_hash", await sha256(token)).maybeSingle();
    if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) return json({ error: "Unauthenticated" }, 401);
    const { data: actor } = await db.from("bigfoods_staff").select("id,role,permissions,is_active,must_change_password").eq("id", session.staff_id).maybeSingle();
    if (!actor?.is_active) return json({ error: "Unauthenticated" }, 401);
    if (actor.must_change_password) return json({ error: "Change your temporary password first" }, 403);
    const action = String(body.action || "");

    if (action === "overview") {
      if (!allowed(actor, "pos.view") && !allowed(actor, "pos.sell") && !allowed(actor, "pos.manage_catalogue")) return json({ error: "Forbidden" }, 403);
      const [catalogue, categories, areas, tables, sessions, shifts, sales, payments] = await Promise.all([
        db.from("bigfoods_pos_items").select("id,name,sku,description,category,subcategory,selling_price,is_available,image_url,item_type,is_featured,track_stock,stock_quantity,low_stock_alert").order("category").order("name").limit(500),
        db.from("menu_catalog_categories").select("id,category_name,subcategory_name").order("category_name").order("subcategory_name"),
        db.from("bigfoods_pos_dining_areas").select("id,name,sort_order,is_active").eq("is_active", true).order("sort_order").order("name"),
        db.from("bigfoods_pos_tables").select("id,dining_area_id,table_number,display_name,capacity,status,is_active").eq("is_active", true).order("sort_order").order("table_number"),
        db.from("bigfoods_pos_table_sessions").select("id,session_number,table_id,service_type,status,guest_count,customer_name,opened_at").in("status", ["open","awaiting_payment"]).order("opened_at", { ascending: false }).limit(100),
        db.from("bigfoods_staff_attendance").select("id,shift_assignment_id,checked_in_at,bigfoods_staff_shift_assignments(id,shift_date,starts_at,ends_at,status,bigfoods_staff_shift_templates(name))").eq("staff_id", actor.id).is("checked_out_at", null).limit(1),
        db.from("bigfoods_pos_sales").select("id,receipt_number,total_amount,payment_method,status,created_at,cashier_staff_id").eq("cashier_staff_id", actor.id).order("created_at", { ascending: false }).limit(100),
        db.from("bigfoods_pos_payments").select("id,sale_id,payment_method,amount,status,reference,created_at,bigfoods_pos_sales(receipt_number,cashier_staff_id)").eq("status", "pending").order("created_at", { ascending: true }).limit(100)
      ]);
      const errors = [catalogue,categories,areas,tables,sessions,shifts,sales,payments].filter(x => x.error);
      if (errors.length) return json({ error: "POS database is not ready. Apply the independent POS migrations first." }, 503);
      return json({ catalogue: catalogue.data ?? [], categories: categories.data ?? [], dining_areas: areas.data ?? [], tables: tables.data ?? [], sessions: sessions.data ?? [], current_attendance: shifts.data?.[0] ?? null, today_sales: sales.data ?? [], pending_payments: (payments.data ?? []).filter((p: any) => p.bigfoods_pos_sales?.cashier_staff_id === actor.id || ["owner","admin"].includes(actor.role)) });
    }

    if (action === "catalogue_create" || action === "catalogue_update" || action === "catalogue_delete") {
      if (!allowed(actor, "pos.manage_catalogue")) return json({ error: "Forbidden" }, 403);
      if (action === "catalogue_delete") {
        if (typeof body.id !== "string") return json({ error: "Select a menu item to delete." }, 400);
        const { data: existing } = await db.from("bigfoods_pos_items").select("id,name").eq("id", body.id).maybeSingle();
        if (!existing) return json({ error: "Menu item not found." }, 404);
        const { error } = await db.from("bigfoods_pos_items").delete().eq("id", body.id);
        if (error) return json({ error: "This item cannot be deleted because it is referenced by existing POS records. Mark it unavailable instead." }, 409);
        await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.catalogue_item_deleted", details: { product_id: existing.id, name: existing.name } });
        return json({ success: true });
      }
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const category = typeof body.category === "string" ? body.category.trim() : "";
      const subcategory = typeof body.subcategory === "string" ? body.subcategory.trim() : "";
      const price = Number(body.selling_price);
      const sku = typeof body.sku === "string" ? body.sku.trim() || null : null;
      const description = typeof body.description === "string" ? body.description.trim().slice(0,1000) || null : null;
      const image_url = typeof body.image_url === "string" ? body.image_url.trim().slice(0,2000) || null : null;
      if (!name || name.length > 160 || !category || category.length > 80 || !money(price)) return json({ error: "Enter a product name, category and valid selling price." }, 400);
      const stockQuantity = Number(body.stock_quantity ?? 0), lowStockAlert = Number(body.low_stock_alert ?? 10);
      if (!Number.isInteger(stockQuantity) || stockQuantity < 0 || !Number.isInteger(lowStockAlert) || lowStockAlert < 0) return json({ error: "Stock quantity and low-stock alert must be non-negative whole numbers." }, 400);
      const values = { name, category, subcategory: subcategory || null, selling_price: price, sku, description, image_url, is_available: body.is_available !== false, item_type: typeof body.item_type === "string" ? body.item_type : "Meal", is_featured: body.is_featured === true, track_stock: body.track_stock !== false, stock_quantity: stockQuantity, low_stock_alert: lowStockAlert, updated_by_staff_id: actor.id };
      const query = action === "catalogue_create"
        ? db.from("bigfoods_pos_items").insert({ ...values, created_by_staff_id: actor.id })
        : db.from("bigfoods_pos_items").update(values).eq("id", body.id);
      if (action === "catalogue_update" && typeof body.id !== "string") return json({ error: "Menu item ID is required." }, 400);
      const { data, error } = await query.select("id,name,sku,description,category,subcategory,selling_price,image_url,is_available,item_type,is_featured,track_stock,stock_quantity,low_stock_alert").single();
      if (error) return json({ error: error.code === "23505" ? "That SKU is already in use." : "Unable to save POS menu item." }, 400);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: action === "catalogue_create" ? "pos.catalogue_item_created" : "pos.catalogue_item_updated", details: { product_id: data.id, name } });
      return json({ item: data }, action === "catalogue_create" ? 201 : 200);
    }

    if (action === "dining_area_save") {
      if (!allowed(actor, "pos.manage_tables")) return json({ error: "Forbidden" }, 403);
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 80) return json({ error: "Enter a dining area name (maximum 80 characters)." }, 400);
      const { data, error } = await db.from("bigfoods_pos_dining_areas").insert({ name, created_by_staff_id: actor.id, sort_order: Number.isInteger(body.sort_order) ? body.sort_order : 0 }).select("*").single();
      if (error) return json({ error: error.code === "23505" ? "That dining area already exists." : "Unable to create dining area." }, 400);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.dining_area_created", details: { area_id: data.id } });
      return json({ dining_area: data }, 201);
    }

    if (action === "table_save") {
      if (!allowed(actor, "pos.manage_tables")) return json({ error: "Forbidden" }, 403);
      const number = typeof body.table_number === "string" ? body.table_number.trim() : "";
      const capacity = Number(body.capacity ?? 2);
      if (!body.dining_area_id || !number || number.length > 32 || !Number.isInteger(capacity) || capacity < 1 || capacity > 50) return json({ error: "Provide a dining area, table number and valid capacity." }, 400);
      const { data, error } = await db.from("bigfoods_pos_tables").insert({ dining_area_id: body.dining_area_id, table_number: number, display_name: typeof body.display_name === "string" ? body.display_name.trim() || null : null, capacity }).select("*").single();
      if (error) return json({ error: error.code === "23505" ? "That table number already exists in this area." : "Unable to create table." }, 400);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.table_created", details: { table_id: data.id } });
      return json({ table: data }, 201);
    }

    if (action === "session_open") {
      if (!allowed(actor, "pos.sell")) return json({ error: "Forbidden" }, 403);
      const service = body.service_type;
      if (!["dine_in","takeaway","counter"].includes(service)) return json({ error: "Choose dine-in, takeaway or counter service." }, 400);
      if (service === "dine_in" && !body.table_id) return json({ error: "Select a table for dine-in service." }, 400);
      const { data, error } = await db.rpc("bigfoods_pos_open_session", {
        p_actor_staff_id: actor.id,
        p_service_type: service,
        p_table_id: service === "dine_in" ? body.table_id : null,
        p_guest_count: Math.max(1, Math.min(50, Number(body.guest_count) || 1)),
        p_customer_name: typeof body.customer_name === "string" ? body.customer_name.trim() || null : null,
        p_notes: typeof body.notes === "string" ? body.notes.trim() || null : null
      });
      if (error || !data) return json({ error: error?.message || "Unable to open service session." }, 409);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.session_opened", details: { session_id: data.id, service_type: service, table_id: data.table_id } });
      return json({ session: data }, 201);
    }

    if (action === "ticket_create") {
      if (!allowed(actor, "pos.sell")) return json({ error: "Forbidden" }, 403);
      if (typeof body.session_id !== "string" || !Array.isArray(body.items) || !body.items.length || body.items.length > 50) return json({ error: "Add at least one item to the kitchen ticket." }, 400);
      const { data: sessionRow } = await db.from("bigfoods_pos_table_sessions").select("id,status").eq("id", body.session_id).maybeSingle();
      if (!sessionRow || !["open","awaiting_payment"].includes(sessionRow.status)) return json({ error: "This service session is no longer open." }, 409);
      const validLines = body.items.every((item: any) => item && typeof item.product_id === "string" && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0 && Number(item.quantity) <= 99);
      if (!validLines) return json({ error: "Each ticket line needs a valid product and quantity." }, 400);
      const ids = [...new Set(body.items.map((item: any) => item.product_id as string))];
      const { data: products, error: productsError } = await db.from("bigfoods_pos_items").select("id,name,is_available").in("id", ids);
      if (productsError || !products || products.length !== ids.length || products.some(p => !p.is_available)) return json({ error: "One or more products are unavailable." }, 400);
      const ticketNumber = "K-" + new Date().toISOString().replace(/[-:TZ.]/g,"").slice(0,14) + "-" + crypto.randomUUID().slice(0,6).toUpperCase();
      const { data: ticket, error } = await db.from("bigfoods_pos_kitchen_tickets").insert({ ticket_number: ticketNumber, session_id: body.session_id, created_by_staff_id: actor.id, notes: typeof body.notes === "string" ? body.notes.trim() || null : null }).select("*").single();
      if (error || !ticket) return json({ error: "Unable to create kitchen ticket." }, 400);
      const rows = body.items.map((item: any) => ({ ticket_id: ticket.id, product_id: item.product_id, product_name: products.find(p => p.id === item.product_id)!.name, quantity: Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1))), item_notes: typeof item.notes === "string" ? item.notes.trim() || null : null }));
      const { error: lineError } = await db.from("bigfoods_pos_kitchen_ticket_items").insert(rows);
      if (lineError) { await db.from("bigfoods_pos_kitchen_tickets").delete().eq("id", ticket.id); return json({ error: "Unable to add ticket items." }, 400); }
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.kitchen_ticket_created", details: { ticket_id: ticket.id, session_id: body.session_id } });
      return json({ ticket }, 201);
    }

    if (action === "checkout") {
      if (!allowed(actor, "pos.sell") || !allowed(actor, "pos.payments")) return json({ error: "Forbidden" }, 403);
      if (typeof body.session_id !== "string" || !Array.isArray(body.items) || !body.items.length || body.items.length > 100) return json({ error: "Add items to the basket before checkout." }, 400);
      if (typeof body.idempotency_key !== "string" || !/^[0-9a-f-]{36}$/i.test(body.idempotency_key)) return json({ error: "Invalid checkout request. Refresh and try again." }, 400);
      const method = body.payment_method;
      if (!["cash","moniepoint_pos","bank_transfer"].includes(method)) return json({ error: "Choose a supported payment method." }, 400);
      const valid = body.items.every((item: any) => item && typeof item.product_id === "string" && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0 && Number(item.quantity) <= 99);
      if (!valid) return json({ error: "Each basket line needs a valid product and quantity." }, 400);
      const { data, error } = await db.rpc("bigfoods_pos_checkout", {
        p_session_id: body.session_id,
        p_cashier_staff_id: actor.id,
        p_idempotency_key: body.idempotency_key,
        p_payment_method: method,
        p_items: body.items.map((item: any) => ({ product_id: item.product_id, quantity: Number(item.quantity) })),
        p_cash_received: method === "cash" ? Number(body.cash_received) : null,
        p_payment_reference: typeof body.payment_reference === "string" ? body.payment_reference.trim().slice(0,120) || null : null
      });
      if (error) return json({ error: error.message || "Unable to complete POS checkout." }, 400);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.sale_completed", details: { sale_id: data.sale_id, receipt_number: data.receipt_number, total_amount: data.total_amount, payment_method: method } });
      return json({ sale: data }, 201);
    }

    if (action === "receipt_get") {
      if (!allowed(actor, "pos.view") && !allowed(actor, "pos.sell")) return json({ error: "Forbidden" }, 403);
      if (typeof body.sale_id !== "string") return json({ error: "Select a sale." }, 400);
      const { data: sale, error: saleError } = await db.from("bigfoods_pos_sales").select("id,receipt_number,cashier_staff_id,created_at,payment_method,status,subtotal,total_amount,cash_received,change_due,payment_note,session_id,cashier_attendance_id").eq("id", body.sale_id).single();
      if (saleError || !sale || (sale.cashier_staff_id !== actor.id && !["owner","admin"].includes(actor.role) && !allowed(actor,"pos.reports"))) return json({ error: "Receipt not found or access denied." }, 404);
      const [lines, payments, refunds] = await Promise.all([
        db.from("bigfoods_pos_sale_items").select("id,product_name,quantity,unit_price,line_total").eq("sale_id",sale.id).order("created_at"),
        db.from("bigfoods_pos_payments").select("id,payment_method,amount,status,reference,confirmed_at").eq("sale_id",sale.id).order("created_at"),
        db.from("bigfoods_pos_refunds").select("id,refund_number,amount,refund_method,reason,reference,status,created_at").eq("sale_id",sale.id).order("created_at")
      ]);
      if (lines.error || payments.error || refunds.error) return json({ error: "Unable to load complete receipt details." }, 503);
      return json({ sale, items: lines.data ?? [], payments: payments.data ?? [], refunds: refunds.data ?? [] });
    }

    if (action === "refund_create") {
      if (!allowed(actor, "pos.refund")) return json({ error: "Forbidden" }, 403);
      if (typeof body.sale_id !== "string" || typeof body.reason !== "string" || typeof body.refund_method !== "string") return json({ error: "Refund details are incomplete." }, 400);
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) return json({ error: "Enter a valid refund amount." }, 400);
      const { data, error } = await db.rpc("bigfoods_pos_create_refund", { p_sale_id: body.sale_id, p_actor_staff_id: actor.id, p_amount: amount, p_refund_method: body.refund_method, p_reason: body.reason.trim(), p_reference: typeof body.reference === "string" ? body.reference.trim() : null });
      if (error) return json({ error: error.message || "Unable to process refund." }, 400);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.refund_created", details: { ...data, reason: body.reason.trim() } });
      return json({ refund: data }, 201);
    }

    if (action === "refund_reverse") {
      if (!allowed(actor, "pos.refund")) return json({ error: "Forbidden" }, 403);
      if (typeof body.refund_id !== "string" || typeof body.reason !== "string") return json({ error: "Refund reversal details are incomplete." }, 400);
      const { data, error } = await db.rpc("bigfoods_pos_reverse_refund", { p_refund_id: body.refund_id, p_actor_staff_id: actor.id, p_reason: body.reason.trim() });
      if (error) return json({ error: error.message || "Unable to reverse refund." }, 400);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.refund_reversed", details: { ...data, reason: body.reason.trim() } });
      return json({ refund: data });
    }

    if (action === "payment_reverse") {
      if (!allowed(actor, "pos.refund")) return json({ error: "Forbidden" }, 403);
      if (typeof body.payment_id !== "string" || typeof body.reason !== "string") return json({ error: "Payment reversal details are incomplete." }, 400);
      const { data, error } = await db.rpc("bigfoods_pos_reverse_payment", { p_payment_id: body.payment_id, p_actor_staff_id: actor.id, p_reason: body.reason.trim(), p_reference: typeof body.reference === "string" ? body.reference.trim() : null });
      if (error) return json({ error: error.message || "Unable to reverse payment." }, 400);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.payment_reversed", details: { ...data, reason: body.reason.trim() } });
      return json({ reversal: data });
    }

    if (action === "payment_confirm") {
      if (!allowed(actor, "pos.payments")) return json({ error: "Forbidden" }, 403);
      if (typeof body.payment_id !== "string") return json({ error: "Select a payment to verify." }, 400);
      const reference = typeof body.reference === "string" ? body.reference.trim().slice(0,120) || null : null;
      const { data, error } = await db.rpc("bigfoods_pos_confirm_payment", {
        p_payment_id: body.payment_id,
        p_actor_staff_id: actor.id,
        p_reference: reference
      });
      if (error) return json({ error: error.message || "Unable to confirm payment." }, 400);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.payment_confirmed", details: { payment_id: data.payment_id, sale_id: data.sale_id, receipt_number: data.receipt_number } });
      return json({ payment: data });
    }

    if (action === "kitchen_update") {
      if (!allowed(actor, "pos.kitchen")) return json({ error: "Forbidden" }, 403);
      const next = body.status;
      if (!["preparing","ready","served","cancelled"].includes(next)) return json({ error: "Invalid kitchen ticket status." }, 400);
      const patch: Record<string, unknown> = { status: next, updated_at: new Date().toISOString() };
      if (next === "preparing") patch.started_at = new Date().toISOString();
      if (next === "ready") patch.ready_at = new Date().toISOString();
      if (next === "served") patch.served_at = new Date().toISOString();
      const { data, error } = await db.from("bigfoods_pos_kitchen_tickets").update(patch).eq("id", body.ticket_id).select("*").single();
      if (error) return json({ error: "Unable to update kitchen ticket." }, 400);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.kitchen_ticket_status_changed", details: { ticket_id: data.id, status: next } });
      return json({ ticket: data });
    }

    return json({ error: "Unknown POS action." }, 400);
  } catch {
    return json({ error: "POS service unavailable." }, 503);
  }
});
