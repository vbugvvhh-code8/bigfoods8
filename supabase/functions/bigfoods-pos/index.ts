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

    if (action === "analytics") {
      if (!allowed(actor, "pos.reports")) return json({ error: "You do not have permission to view reports." }, 403);
      const fromDate = typeof body.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.from) ? body.from : new Date(Date.now() - 29 * 86400000).toISOString().slice(0,10);
      const toDate = typeof body.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.to) ? body.to : new Date().toISOString().slice(0,10);
      if (fromDate > toDate) return json({ error: "The report start date must be before the end date." }, 400);
      const start = new Date(fromDate + "T00:00:00.000Z");
      const end = new Date(new Date(toDate + "T00:00:00.000Z").getTime() + 86400000 - 1);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end.getTime() - start.getTime() > 366 * 86400000) {
        return json({ error: "Choose a valid date range of up to one year." }, 400);
      }
      const [salesQ, itemsQ, paymentsQ, refundsQ, sessionsQ, priorCustomersQ, inventoryQ, batchesQ, posStockQ, staffQ] = await Promise.all([
        db.from("bigfoods_pos_sales")
          .select("id,receipt_number,payment_method,status,subtotal,total_amount,discount_amount,tax_amount,created_at,session_id,cashier_staff_id,customer_email,bigfoods_pos_sale_items(product_id,product_name,quantity,unit_price,line_total)")
          .gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
          .order("created_at", { ascending: true }).limit(10000),
        db.from("bigfoods_pos_items").select("id,name,category,item_type,image_url").limit(1000),
        db.from("bigfoods_pos_payments").select("sale_id,payment_method,amount,status,created_at")
          .gte("created_at", start.toISOString()).lte("created_at", end.toISOString()).limit(10000),
        db.from("bigfoods_pos_refunds").select("sale_id,amount,status,created_at,refund_method")
          .gte("created_at", start.toISOString()).lte("created_at", end.toISOString()).limit(10000),
        db.from("bigfoods_pos_table_sessions").select("id,service_type,opened_at")
          .gte("opened_at", start.toISOString()).lte("opened_at", end.toISOString()).limit(10000),
        db.from("bigfoods_pos_sales").select("customer_email,created_at")
          .not("customer_email", "is", null).in("status", ["paid", "partially_refunded", "refunded"]).lt("created_at", start.toISOString()).limit(10000),
        db.from("inventory_items").select("id,name,category,base_unit,reorder_level,is_active,image_url")
          .eq("is_active", true).limit(2000),
        db.from("inventory_batches").select("id,inventory_item_id,batch_code,remaining_quantity,unit_cost,status,expires_at,received_at")
          .order("received_at", { ascending: false }).limit(10000),
        db.from("bigfoods_pos_items").select("id,name,category,item_type,image_url,is_available,track_stock,stock_quantity,low_stock_alert")
          .eq("track_stock", true).limit(1000),
        db.from("bigfoods_staff").select("id,display_name,role,is_active").eq("is_active", true).limit(1000)
      ]);
      const failures = [salesQ, itemsQ, paymentsQ, refundsQ, sessionsQ, priorCustomersQ, inventoryQ, batchesQ, posStockQ, staffQ].filter(q => q.error);
      if (failures.length) return json({ error: "Unable to load BigFoods POS and inventory report data." }, 503);

      const settledSales = (salesQ.data ?? []).filter(sale => ["paid", "partially_refunded", "refunded"].includes(sale.status));
      const refundsBySale = new Map<string, number>();
      for (const refund of (refundsQ.data ?? []).filter(refund => refund.status === "completed")) {
        refundsBySale.set(refund.sale_id, (refundsBySale.get(refund.sale_id) ?? 0) + Number(refund.amount || 0));
      }
      const staffSales = new Map<string, { orders: number; revenue: number }>();
      for (const sale of settledSales) {
        if (!sale.cashier_staff_id) continue;
        const current = staffSales.get(sale.cashier_staff_id) ?? { orders: 0, revenue: 0 };
        current.orders += 1;
        current.revenue += Number(sale.total_amount || 0) - (refundsBySale.get(sale.id) ?? 0);
        staffSales.set(sale.cashier_staff_id, current);
      }
      const staff = (staffQ.data ?? []).map(person => ({
        id: person.id,
        name: person.display_name,
        role: person.role,
        orders: staffSales.get(person.id)?.orders ?? 0,
        revenue: staffSales.get(person.id)?.revenue ?? 0
      }));
      return json({
        sales: (salesQ.data ?? []).map(sale => ({ ...sale, bigfoods_pos_sale_items: sale.bigfoods_pos_sale_items ?? [] })),
        items: itemsQ.data ?? [],
        payments: paymentsQ.data ?? [],
        refunds: refundsQ.data ?? [],
        sessions: sessionsQ.data ?? [],
        prior_customers: priorCustomersQ.data ?? [],
        inventory_items: inventoryQ.data ?? [],
        inventory_batches: batchesQ.data ?? [],
        pos_stock_items: posStockQ.data ?? [],
        staff_performance: staff
      });
    }

    if (action === "settings_get") {
      if (!allowed(actor, "pos.view") && !allowed(actor, "pos.sell") && !allowed(actor, "pos.reports")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.from("bigfoods_pos_settings").select("tax_enabled,tax_rate,discount_enabled,discount_allowed_roles,discount_max_percent").eq("id", true).single();
      if (error) return json({ error: "Unable to load POS settings." }, 503);
      return json({ settings: data });
    }

    if (action === "settings_save") {
      if (!["owner","admin"].includes(actor.role)) return json({ error: "Only an owner or administrator can change POS pricing settings." }, 403);
      const taxRate = Number(body.tax_rate), maxDiscount = Number(body.discount_max_percent);
      const validRoles = ["owner","admin","manager","supervisor","cashier"];
      const roles = Array.isArray(body.discount_allowed_roles) ? body.discount_allowed_roles.filter((x: unknown) => typeof x === "string" && validRoles.includes(x)) : [];
      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 30 || !Number.isFinite(maxDiscount) || maxDiscount < 0 || maxDiscount > 100 || !roles.length) return json({ error: "Check the tax rate, discount limit and at least one permitted role." }, 400);
      const values = { tax_enabled: body.tax_enabled === true, tax_rate: taxRate, discount_enabled: body.discount_enabled === true, discount_allowed_roles: [...new Set(roles)], discount_max_percent: maxDiscount, updated_by_staff_id: actor.id, updated_at: new Date().toISOString() };
      const { data, error } = await db.from("bigfoods_pos_settings").upsert({ id: true, ...values }, { onConflict: "id" }).select("tax_enabled,tax_rate,discount_enabled,discount_allowed_roles,discount_max_percent").single();
      if (error) return json({ error: "Unable to save POS settings." }, 400);
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.pricing_settings_updated", details: values });
      return json({ settings: data });
    }

    if (action === "overview") {
      if (!allowed(actor, "pos.view") && !allowed(actor, "pos.sell") && !allowed(actor, "pos.manage_catalogue")) return json({ error: "Forbidden" }, 403);
      const [catalogue, categories, areas, tables, sessions, shifts, sales, payments, pricing] = await Promise.all([
        db.from("bigfoods_pos_items").select("id,name,sku,description,category,subcategory,selling_price,is_available,image_url,item_type,is_featured,track_stock,stock_quantity,low_stock_alert").order("category").order("name").limit(500),
        db.from("menu_catalog_categories").select("id,category_name,subcategory_name").order("category_name").order("subcategory_name"),
        db.from("bigfoods_pos_dining_areas").select("id,name,sort_order,is_active").eq("is_active", true).order("sort_order").order("name"),
        db.from("bigfoods_pos_tables").select("id,dining_area_id,table_number,display_name,capacity,status,is_active").eq("is_active", true).order("sort_order").order("table_number"),
        db.from("bigfoods_pos_table_sessions").select("id,session_number,table_id,service_type,status,guest_count,customer_name,opened_at").in("status", ["open","awaiting_payment"]).order("opened_at", { ascending: false }).limit(100),
        db.from("bigfoods_staff_attendance").select("id,work_location_id,shift_assignment_id,checked_in_at,bigfoods_staff_shift_assignments(id,shift_date,starts_at,ends_at,status,bigfoods_staff_shift_templates(name))").eq("staff_id", actor.id).is("checked_out_at", null).limit(1),
        db.from("bigfoods_pos_sales").select("id,receipt_number,total_amount,payment_method,status,created_at,cashier_staff_id").eq("cashier_staff_id", actor.id).order("created_at", { ascending: false }).limit(100),
        db.from("bigfoods_pos_payments").select("id,sale_id,payment_method,amount,status,reference,created_at,bigfoods_pos_sales(receipt_number,cashier_staff_id)").eq("status", "pending").order("created_at", { ascending: true }).limit(100),
        db.from("bigfoods_pos_settings").select("tax_enabled,tax_rate,discount_enabled,discount_allowed_roles,discount_max_percent").eq("id", true).single()
      ]);
      const errors = [catalogue,categories,areas,tables,sessions,shifts,sales,payments,pricing].filter(x => x.error);
      if (errors.length) return json({ error: "POS database is not ready. Apply the independent POS migrations first." }, 503);
      const activeAttendance = shifts.data?.[0] ?? null;
      let visibleCatalogue: any[] = [];
      if (activeAttendance?.work_location_id) {
        const [branchLinks, branchStock] = await Promise.all([
          db.from("bigfoods_pos_branch_items").select("pos_item_id,selling_price,sort_order").eq("work_location_id", activeAttendance.work_location_id).eq("is_available", true).order("sort_order"),
          db.from("bigfoods_pos_branch_menu_stock").select("pos_item_id,track_stock,stock_quantity").eq("work_location_id", activeAttendance.work_location_id)
        ]);
        if (branchLinks.error || branchStock.error) return json({ error: "Unable to load this branch menu and prepared stock." }, 503);
        const itemIds = (branchLinks.data ?? []).map((row: any) => row.pos_item_id);
        if (itemIds.length) {
          const { data: branchProducts, error: productError } = await db.from("bigfoods_pos_items").select("id,name,sku,description,category,subcategory,selling_price,is_available,image_url,item_type,is_featured,track_stock,stock_quantity,low_stock_alert").in("id", itemIds).eq("is_available", true);
          if (productError) return json({ error: "Unable to load this branch POS menu." }, 503);
          const stockByItem = new Map((branchStock.data ?? []).map((row: any) => [row.pos_item_id, row]));
          const linksByItem = new Map((branchLinks.data ?? []).map((row: any) => [row.pos_item_id, row]));
          visibleCatalogue = (branchProducts ?? []).filter((item: any) => { const stock: any = stockByItem.get(item.id); return stock && (stock.track_stock !== true || Number(stock.stock_quantity ?? 0) > 0); }).map((item: any) => {
            const link: any = linksByItem.get(item.id), stock: any = stockByItem.get(item.id);
            return { ...item, selling_price: link?.selling_price ?? item.selling_price, track_stock: stock?.track_stock ?? true, stock_quantity: stock?.stock_quantity ?? 0 };
          }).sort((a: any,b: any) => { const left: any = linksByItem.get(a.id), right: any = linksByItem.get(b.id); return Number(left?.sort_order ?? 0)-Number(right?.sort_order ?? 0) || String(a.name).localeCompare(String(b.name)); });
        }
      }
      return json({ catalogue: visibleCatalogue, categories: categories.data ?? [], dining_areas: areas.data ?? [], tables: tables.data ?? [], sessions: sessions.data ?? [], current_attendance: activeAttendance, today_sales: sales.data ?? [], pending_payments: (payments.data ?? []).filter((p: any) => p.bigfoods_pos_sales?.cashier_staff_id === actor.id || ["owner","admin"].includes(actor.role)), pricing_settings: pricing.data });
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
      const { data: activeAttendance, error: attendanceError } = await db.from("bigfoods_staff_attendance")
        .select("id,work_location_id").eq("staff_id", actor.id).is("checked_out_at", null).maybeSingle();
      if (attendanceError || !activeAttendance?.work_location_id) return json({ error: "Check in at your assigned branch before processing a POS sale." }, 409);
      if (typeof body.session_id !== "string" || !Array.isArray(body.items) || !body.items.length || body.items.length > 100) return json({ error: "Add items to the basket before checkout." }, 400);
      if (typeof body.idempotency_key !== "string" || !/^[0-9a-f-]{36}$/i.test(body.idempotency_key)) return json({ error: "Invalid checkout request. Refresh and try again." }, 400);
      const method = body.payment_method;
      if (!["cash","moniepoint_pos","bank_transfer"].includes(method)) return json({ error: "Choose a supported payment method." }, 400);
      if (method === "bank_transfer" && body.transfer_confirmed === true && (typeof body.payment_reference !== "string" || !body.payment_reference.trim())) return json({ error: "Enter the verified bank transfer reference." }, 400);
      const valid = body.items.every((item: any) => item && typeof item.product_id === "string" && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0 && Number(item.quantity) <= 99);
      if (!valid) return json({ error: "Each basket line needs a valid product and quantity." }, 400);
      const { data, error } = await db.rpc("bigfoods_pos_checkout_priced", {
        p_session_id: body.session_id,
        p_cashier_staff_id: actor.id,
        p_idempotency_key: body.idempotency_key,
        p_payment_method: method,
        p_items: body.items.map((item: any) => ({ product_id: item.product_id, quantity: Number(item.quantity) })),
        p_cash_received: method === "cash" ? Number(body.cash_received) : null,
        p_payment_reference: typeof body.payment_reference === "string" ? body.payment_reference.trim().slice(0,120) || null : null,
        p_discount_amount: Number(body.discount_amount || 0),
        p_customer_email: typeof body.customer_email === "string" ? body.customer_email.trim().slice(0,254) || null : null,
        p_actor_role: actor.role
      });
      if (error) return json({ error: error.message || "Unable to complete POS checkout." }, 400);
      let confirmedPayment = null;
      if (method === "bank_transfer" && body.transfer_confirmed === true) {
        const reference = typeof body.payment_reference === "string" ? body.payment_reference.trim().slice(0,120) : "";
        const { data: paymentRow, error: paymentLookupError } = await db.from("bigfoods_pos_payments").select("id").eq("sale_id", data.sale_id).eq("status", "pending").single();
        if (paymentLookupError || !paymentRow) return json({ error: "Sale was recorded, but its transfer confirmation could not be found. Check pending payments before retrying." }, 409);
        const { data: confirmation, error: confirmationError } = await db.rpc("bigfoods_pos_confirm_payment", { p_payment_id: paymentRow.id, p_actor_staff_id: actor.id, p_reference: reference });
        if (confirmationError) return json({ error: "Sale was recorded, but transfer confirmation failed: " + confirmationError.message }, 409);
        confirmedPayment = confirmation;
        await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.payment_confirmed", details: { payment_id: confirmation.payment_id, sale_id: confirmation.sale_id, receipt_number: confirmation.receipt_number, confirmation_source: "cashier_checkout_transfer_checkbox" } });
      }
      await db.from("bigfoods_staff_audit_events").insert({ actor_staff_id: actor.id, action: "pos.sale_completed", details: { sale_id: data.sale_id, receipt_number: data.receipt_number, total_amount: data.total_amount, payment_method: method } });
      return json({ sale: data, confirmed_payment: confirmedPayment }, 201);
    }

    if (action === "orders_list") {
      if (!allowed(actor, "pos.reports")) return json({ error: "You do not have permission to view POS order history." }, 403);
      const from = typeof body.from === "string" && !Number.isNaN(Date.parse(body.from)) ? new Date(body.from).toISOString() : new Date(Date.now() - 30 * 86400000).toISOString();
      const to = typeof body.to === "string" && !Number.isNaN(Date.parse(body.to)) ? new Date(body.to).toISOString() : new Date().toISOString();
      const limit = Math.min(500, Math.max(1, Number(body.limit) || 500));
      const { data, error } = await db.from("bigfoods_pos_sales")
        .select("id,receipt_number,cashier_staff_id,customer_email,payment_method,status,subtotal,discount_amount,tax_amount,total_amount,created_at,cash_received,change_due,bigfoods_staff(display_name),bigfoods_pos_sale_items(id,product_id,product_name,quantity,unit_price,line_total,bigfoods_pos_items(image_url)),bigfoods_pos_payments(id,payment_method,amount,status,reference,confirmed_at),bigfoods_pos_table_sessions(service_type,customer_name,guest_count,bigfoods_pos_tables(table_number,display_name,bigfoods_pos_dining_areas(name)))")
        .gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false }).limit(limit);
      if (error) return json({ error: "Unable to load POS order history." }, 503);
      const orders = (data || []).map((s: any) => {
        const session = Array.isArray(s.bigfoods_pos_table_sessions) ? s.bigfoods_pos_table_sessions[0] : s.bigfoods_pos_table_sessions;
        const table = session?.bigfoods_pos_tables;
        const diningArea = table?.bigfoods_pos_dining_areas;
        const payment = (s.bigfoods_pos_payments || [])[0];
        const paymentStatus = payment?.status === "confirmed" ? "paid" : payment?.status || s.status;
        return {
          id: s.id, number: s.receipt_number, source: "pos",
          customer: session?.customer_name || "Walk-in Customer",
          email: s.customer_email, cashier: s.bigfoods_staff?.display_name || "Staff",
          type: session?.service_type || "counter",
          table: table?.display_name || table?.table_number || null,
          dining_area: diningArea?.name || null,
          guest_count: Number(session?.guest_count || 1),
          payment_method: s.payment_method, payment_status: paymentStatus,
          status: s.status, subtotal: Number(s.subtotal || 0),
          discount: Number(s.discount_amount || 0), tax: Number(s.tax_amount || 0),
          total: Number(s.total_amount || 0), cash_received: Number(s.cash_received || 0),
          change_due: Number(s.change_due || 0), created_at: s.created_at,
          items: (s.bigfoods_pos_sale_items || []).map((i: any) => ({
            id: i.id, product_id: i.product_id, name: i.product_name,
            image_url: i.bigfoods_pos_items?.image_url || null,
            quantity: Number(i.quantity), unit_price: Number(i.unit_price), total: Number(i.line_total)
          })),
          payments: s.bigfoods_pos_payments || []
        };
      });
      const paid = orders.filter((o: any) => o.payment_status === "paid" || o.status === "completed" || o.status === "delivered");
      const pending = orders.filter((o: any) => ["pending","awaiting_payment","needs_review"].includes((o.payment_status || "").toLowerCase()));
      return json({ orders, summary: { total_orders: orders.length, total_sales: paid.reduce((n: number, o: any) => n + o.total, 0), pos_orders: orders.length, online_orders: 0, paid_orders: paid.length, pending_payments: pending.length } });
    }

    if (action === "receipt_get") {
      if (!allowed(actor, "pos.view") && !allowed(actor, "pos.sell") && !allowed(actor, "pos.reports")) return json({ error: "Forbidden" }, 403);
      if (typeof body.sale_id !== "string") return json({ error: "Select a sale." }, 400);
      const { data: sale, error: saleError } = await db.from("bigfoods_pos_sales").select("id,receipt_number,cashier_staff_id,created_at,payment_method,status,subtotal,discount_amount,tax_amount,total_amount,customer_email,cash_received,change_due,payment_note,session_id,cashier_attendance_id").eq("id", body.sale_id).single();
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
