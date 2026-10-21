import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Authentication required" }, 401);
    const userClient = createClient(URL, ANON, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Invalid session" }, 401);
    const body = await req.json();
    const action = body?.action;
    const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: adminFlag, error: adminError } = await userClient.rpc("is_admin");
    const isAdmin = !adminError && adminFlag === true;

    if (action === "list_admin") {
      if (!isAdmin) return json({ error: "Administrator access required" }, 403);
      const [orders, riders, settings] = await Promise.all([
        admin.from("orders").select("id,zone,status,payment_status,delivery_address,delivery_fee,rider_id,restaurant_id,placed_at").in("status", ["placed", "preparing"]).is("rider_id", null).order("placed_at", { ascending: true }).limit(100),
        admin.from("riders").select("id,name,zone,status,approval_status,verification_fee_paid,waiver_completed,dispatch_disabled").order("name"),
        admin.from("platform_settings").select("key,value").in("key", ["dispatch_restaurant_assignment_enabled", "dispatch_rider_offers_enabled"]),
      ]);
      if (orders.error || riders.error || settings.error) return json({ error: "Could not load dispatch data" }, 500);
      return json({ orders: orders.data, riders: riders.data, settings: settings.data });
    }

    if (action === "rider_offers") {
      const { data, error } = await userClient.rpc("rider_nearby_order_offers");
      if (error) return json({ error: "Could not load order offers" }, 500);
      return json({ offers: data ?? [] });
    }

    if (action === "respond_offer") {
      const orderId = body?.order_id;
      if (typeof orderId !== "string" || typeof body?.accept !== "boolean") return json({ error: "Invalid offer response" }, 400);
      const { data, error } = await userClient.rpc("rider_respond_to_order_offer", { p_order_id: orderId, p_accept: body.accept });
      if (error) return json({ error: "Could not respond to this offer" }, 500);
      if (!data?.ok) return json({ error: data?.error ?? "Offer unavailable" }, 409);
      return json({ ok: true, status: data.status });
    }

    if (action === "assign_rider") {
      if (!isAdmin && typeof body?.restaurant_order_id !== "string") return json({ error: "Administrator access required" }, 403);
      const orderId = isAdmin ? body?.order_id : body?.restaurant_order_id;
      if (typeof orderId !== "string" || typeof body?.rider_id !== "string") return json({ error: "Order and rider are required" }, 400);
      // The SQL assignment RPC performs ownership, setting, payment, eligibility, and zone checks.
      const { data, error } = await userClient.rpc("dispatch_assign_rider", { p_order_id: orderId, p_rider_id: body.rider_id });
      if (error) return json({ error: "Could not assign rider" }, 500);
      if (!data?.ok) return json({ error: data?.error ?? "Assignment failed" }, 409);
      return json({ ok: true, order_id: orderId, rider_id: body.rider_id });
    }

    if (action === "set_setting") {
      if (!isAdmin) return json({ error: "Administrator access required" }, 403);
      if (!["dispatch_restaurant_assignment_enabled", "dispatch_rider_offers_enabled"].includes(body?.key) || typeof body?.enabled !== "boolean") return json({ error: "Invalid setting" }, 400);
      const { data, error } = await userClient.rpc("admin_set_dispatch_setting", { p_key: body.key, p_enabled: body.enabled });
      if (error) return json({ error: "Could not save dispatch setting" }, 500);
      if (!data?.ok) return json({ error: data?.error ?? "Could not save dispatch setting" }, 403);
      return json({ ok: true });
    }

    if (action === "set_rider_disabled") {
      if (!isAdmin) return json({ error: "Administrator access required" }, 403);
      if (typeof body?.rider_id !== "string" || typeof body?.disabled !== "boolean") return json({ error: "Invalid rider setting" }, 400);
      const { data, error } = await userClient.rpc("admin_set_rider_dispatch_disabled", { p_rider_id: body.rider_id, p_disabled: body.disabled });
      if (error) return json({ error: "Could not update rider dispatch access" }, 500);
      if (!data?.ok) return json({ error: data?.error ?? "Could not update rider" }, 404);
      return json({ ok: true });
    }

    if (action === "create_offers") {
      if (!isAdmin) return json({ error: "Administrator access required" }, 403);
      if (typeof body?.order_id !== "string") return json({ error: "Order id is required" }, 400);
      const { data, error } = await userClient.rpc("dispatch_create_order_offers", { p_order_id: body.order_id });
      if (error) return json({ error: "Could not create rider offers" }, 500);
      if (!data?.ok) return json({ error: data?.error ?? "Could not create offers" }, 409);
      return json({ ok: true, offers_created: data.offers_created ?? 0 });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("DISPATCH_MARKETPLACE_ERROR", error instanceof Error ? error.message : String(error));
    return json({ error: "Dispatch request failed unexpectedly" }, 500);
  }
});
