import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Rewritten to match the current architecture: initialize-order-payment now
// creates the order (or order_group + delivery_batches for a multi-
// restaurant cart) EAGERLY, in a payment_status='pending' state, before
// payment happens -- this function's job is just to re-verify with
// Paystack directly, flip payment_status to 'paid', and THEN run dispatch
// (never before payment clears). It no longer creates orders from metadata
// the way the original version did -- that approach predates the eager-
// creation model and would double-insert / silently do nothing against it.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function assignRiderToBatch(admin: ReturnType<typeof createClient>, batchId: string) {
  const { data: batch } = await admin.from("delivery_batches").select("id, route_sequence").eq("id", batchId).single();
  if (!batch?.route_sequence?.length) return;
  const firstRestaurantId = batch.route_sequence[0];
  const { data: firstRestaurant } = await admin.from("restaurants").select("latitude, longitude, zone").eq("id", firstRestaurantId).single();
  if (!firstRestaurant) return;

  const { data: seedSetting } = await admin.from("platform_settings").select("value").eq("key", "show_seed_data").maybeSingle();
  const includeSeed = seedSetting?.value === true || seedSetting?.value === "true" || seedSetting === null;

  let riderQuery = admin.from("riders").select("id, lat, lng").eq("status", "online").eq("approval_status", "approved").not("lat", "is", null);
  if (firstRestaurant.zone) riderQuery = riderQuery.eq("zone", firstRestaurant.zone);
  if (!includeSeed) riderQuery = riderQuery.eq("is_seed_data", false);
  const { data: candidates } = await riderQuery;

  let nearestRiderId: string | null = null;
  if (candidates?.length && firstRestaurant.latitude && firstRestaurant.longitude) {
    let nearestDistance = Infinity;
    for (const r of candidates) {
      const d = haversineKm(firstRestaurant.latitude, firstRestaurant.longitude, r.lat, r.lng);
      if (d < nearestDistance) { nearestDistance = d; nearestRiderId = r.id; }
    }
  } else if (candidates?.length) {
    nearestRiderId = candidates[0].id;
  }

  if (nearestRiderId) {
    await admin.from("delivery_batches").update({
      rider_id: nearestRiderId, status: "collecting", last_dispatch_attempt_at: new Date().toISOString(), dispatch_retry_count: 0,
    }).eq("id", batchId);
    await admin.from("orders").update({ rider_id: nearestRiderId }).eq("delivery_batch_id", batchId);
  } else {
    await admin.from("delivery_batches").update({
      last_dispatch_attempt_at: new Date().toISOString(), dispatch_retry_count: 1,
    }).eq("id", batchId);
  }
}

async function createRiderOffersForOrder(admin: ReturnType<typeof createClient>, orderId: string) {
  const { data: setting } = await admin.from("platform_settings").select("value")
    .eq("key", "dispatch_rider_offers_enabled").maybeSingle();
  const offersEnabled = setting?.value === true || setting?.value === "true";
  if (!offersEnabled) return 0;

  const { data: order, error: orderError } = await admin.from("orders")
    .select("id, zone, rider_id, payment_status, status")
    .eq("id", orderId).single();
  if (orderError || !order || order.rider_id || order.payment_status !== "paid"
    || !["placed", "preparing"].includes(order.status)) return 0;

  const { data: riders, error: ridersError } = await admin.from("riders")
    .select("id")
    .eq("status", "online")
    .eq("approval_status", "approved")
    .eq("waiver_completed", true)
    .eq("dispatch_disabled", false)
    .eq("zone", order.zone);
  if (ridersError || !riders?.length) return 0;

  const rows = riders.map((r: { id: string }) => ({ order_id: order.id, rider_id: r.id }));
  const { data: inserted, error: insertError } = await admin.from("rider_order_offers")
    .upsert(rows, { onConflict: "order_id,rider_id", ignoreDuplicates: true })
    .select("id");
  if (insertError) {
    console.error("DISPATCH_OFFER_CREATE_FAILED", { orderId, message: insertError.message });
    return 0;
  }
  return inserted?.length ?? 0;
}

async function dispatchSingleOrder(admin: ReturnType<typeof createClient>, orderId: string) {
  const { data: order, error: loadError } = await admin
    .from("orders")
    .select("id, status, cancelled_at, cancelled_by")
    .eq("id", orderId)
    .single();
  if (loadError || !order) throw loadError ?? new Error("Order not found");

  // initialize-order-payment creates unpaid placeholder rows with status
  // cancelled. Restore only those placeholders after Paystack verifies payment;
  // never resurrect a genuine cancellation.
  const patch: Record<string, unknown> = {
    payment_status: "paid",
    last_dispatch_attempt_at: new Date().toISOString(),
    dispatch_retry_count: 0,
  };
  if (order.status === "cancelled" && !order.cancelled_at && !order.cancelled_by) {
    patch.status = "placed";
  }
  const { error } = await admin.from("orders").update(patch).eq("id", orderId);
  if (error) throw error;
  await createRiderOffersForOrder(admin, orderId);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Not authenticated" }, 401);
    const user = userData.user;

    const { reference } = await req.json();
    if (!reference) return json({ error: "Missing reference" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: txn, error: txnError } = await admin
      .from("transactions")
      .select("*")
      .eq("reference", reference)
      .eq("type", "order_payment")
      .single();
    if (txnError || !txn) return json({ error: "Transaction not found" }, 404);
    if (txn.customer_id !== user.id) return json({ error: "Transaction not found" }, 404);

    // Idempotent replay (customer hits back/refresh on the callback page).
    if (txn.status === "success") {
      if (txn.order_id) {
        // Retry idempotent dispatch side effects if an earlier callback marked
        // payment successful but failed before creating rider offers.
        await dispatchSingleOrder(admin, txn.order_id);
        const { data: existingOrder } = await admin.from("orders").select("delivery_code").eq("id", txn.order_id).single();
        return json({ success: true, order_id: txn.order_id, delivery_code: existingOrder?.delivery_code, already_processed: true });
      }
      if (txn.order_group_id) {
        const { data: batches } = await admin.from("delivery_batches").select("id, delivery_code, route_sequence").eq("order_group_id", txn.order_group_id);
        return json({ success: true, order_group_id: txn.order_group_id, batches, already_processed: true });
      }
    }

    if (!PAYSTACK_SECRET_KEY) return json({ error: "Payments aren't configured yet." }, 502);

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const verifyData = await verifyRes.json();
    const paystackStatus = verifyData?.data?.status;

    if (!verifyRes.ok || paystackStatus !== "success") {
      await admin.from("transactions").update({ status: "failed" }).eq("id", txn.id);
      if (txn.order_id) await admin.from("orders").update({ payment_status: "failed" }).eq("id", txn.order_id);
      if (txn.order_group_id) await admin.from("order_groups").update({ payment_status: "failed" }).eq("id", txn.order_group_id);
      return json({ success: false, error: "Payment was not successful" });
    }

    await admin.from("transactions").update({ status: "success" }).eq("id", txn.id);

    if (txn.order_id) {
      await dispatchSingleOrder(admin, txn.order_id);
      const { data: order } = await admin.from("orders").select("delivery_code").eq("id", txn.order_id).single();
      return json({ success: true, order_id: txn.order_id, delivery_code: order?.delivery_code });
    }

    if (txn.order_group_id) {
      await admin.from("order_groups").update({ payment_status: "paid" }).eq("id", txn.order_group_id);
      // These rows are initialized as cancelled placeholders, not user-cancelled
      // orders. Restore only rows with no cancellation metadata.
      await admin.from("orders")
        .update({ status: "placed", payment_status: "paid" })
        .eq("order_group_id", txn.order_group_id)
        .eq("status", "cancelled")
        .is("cancelled_at", null)
        .is("cancelled_by", null);
      await admin.from("orders")
        .update({ payment_status: "paid" })
        .eq("order_group_id", txn.order_group_id)
        .neq("status", "cancelled");
      // Default dispatch policy is admin assignment only. Do not select or
      // assign a rider during payment verification. Rider self-assignment and
      // restaurant-owner assignment are controlled separately by admin settings.
      const { data: batchCodes } = await admin.from("delivery_batches").select("id, delivery_code").eq("order_group_id", txn.order_group_id);
      return json({ success: true, order_group_id: txn.order_group_id, batches: batchCodes });
    }

    return json({ error: "Transaction has no linked order or order group" }, 500);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
