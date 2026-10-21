import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const FROM_ADDRESS = "BigFoods <onboarding@opticsview.store>";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) return json({ error: "unauthorized" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: seedSetting } = await admin.from("platform_settings").select("value").eq("key", "show_seed_data").maybeSingle();
  const includeSeed = seedSetting?.value === true || seedSetting?.value === "true" || seedSetting === null;

  let reassigned = 0;
  const toNotify: { id: string; retry_count: number }[] = [];

  async function isActiveServiceArea(state: string | null | undefined, zone: string | null | undefined) {
    if (!state || !zone) return false;
    const { data, error } = await admin.from("locations").select("state, lga, is_active").eq("state", state);
    if (error) return false;
    return (data ?? []).some((location: any) =>
      (zone === location.lga || zone === `${location.lga} (${location.state})`) && location.is_active
    );
  }

  // ---- Single (non-batched) orders ----
  const { data: stuckOrders } = await admin
    .from("orders").select("id, zone, dispatch_retry_count, restaurant_id")
    .in("status", ["placed", "preparing"]).is("rider_id", null).is("delivery_batch_id", null).eq("payment_status", "paid");

  if (stuckOrders?.length) {
    const restaurantIds = [...new Set(stuckOrders.map((o) => o.restaurant_id).filter(Boolean))];
    const { data: restaurants } = await admin.from("restaurants").select("id, latitude, longitude, state, zone").in("id", restaurantIds);
    const restaurantById = new Map((restaurants ?? []).map((r) => [r.id, r]));

    for (const order of stuckOrders) {
      const restaurant = order.restaurant_id ? restaurantById.get(order.restaurant_id) : null;
      // Leave paid orders untouched while their area is inactive; do not assign
      // riders or silently cancel/change the order.
      if (!restaurant || !(await isActiveServiceArea(restaurant.state, restaurant.zone))) continue;
      let query = admin.from("riders").select("id, lat, lng").eq("status", "online").eq("approval_status", "approved").not("lat", "is", null);
      if (order.zone) query = query.eq("zone", order.zone);
      if (!includeSeed) query = query.eq("is_seed_data", false);
      const { data: candidates } = await query;
      let riderId: string | null = null;
      if (candidates?.length) {
        if (restaurant?.latitude && restaurant?.longitude) {
          let nearestDistance = Infinity;
          for (const r of candidates) {
            const d = haversineKm(restaurant.latitude, restaurant.longitude, r.lat, r.lng);
            if (d < nearestDistance) { nearestDistance = d; riderId = r.id; }
          }
        } else riderId = candidates[0].id;
      }
      if (riderId) {
        await admin.from("orders").update({ rider_id: riderId, dispatch_retry_count: 0, last_dispatch_attempt_at: new Date().toISOString() }).eq("id", order.id);
        reassigned++;
      } else {
        const newCount = (order.dispatch_retry_count ?? 0) + 1;
        await admin.from("orders").update({ dispatch_retry_count: newCount, last_dispatch_attempt_at: new Date().toISOString() }).eq("id", order.id);
        if (newCount > 1 && newCount % 10 === 0) toNotify.push({ id: order.id, retry_count: newCount });
      }
    }
  }

  // ---- Multi-restaurant delivery batches ----
  const { data: stuckBatches } = await admin
    .from("delivery_batches").select("id, route_sequence, dispatch_retry_count")
    .eq("status", "assigning").is("rider_id", null);

  for (const batch of stuckBatches ?? []) {
    if (!batch.route_sequence?.length) continue;
    const firstRestaurantId = batch.route_sequence[0];
    const { data: firstRestaurant } = await admin.from("restaurants").select("latitude, longitude, zone, state").eq("id", firstRestaurantId).single();
    if (!firstRestaurant) continue;
    if (!(await isActiveServiceArea(firstRestaurant.state, firstRestaurant.zone))) continue;

    let query = admin.from("riders").select("id, lat, lng").eq("status", "online").eq("approval_status", "approved").not("lat", "is", null);
    if (firstRestaurant.zone) query = query.eq("zone", firstRestaurant.zone);
    if (!includeSeed) query = query.eq("is_seed_data", false);
    const { data: candidates } = await query;

    let riderId: string | null = null;
    if (candidates?.length) {
      if (firstRestaurant.latitude && firstRestaurant.longitude) {
        let nearestDistance = Infinity;
        for (const r of candidates) {
          const d = haversineKm(firstRestaurant.latitude, firstRestaurant.longitude, r.lat, r.lng);
          if (d < nearestDistance) { nearestDistance = d; riderId = r.id; }
        }
      } else riderId = candidates[0].id;
    }

    if (riderId) {
      await admin.from("delivery_batches").update({ rider_id: riderId, status: "collecting", dispatch_retry_count: 0, last_dispatch_attempt_at: new Date().toISOString() }).eq("id", batch.id);
      await admin.from("orders").update({ rider_id: riderId }).eq("delivery_batch_id", batch.id);
      reassigned++;
    } else {
      const newCount = (batch.dispatch_retry_count ?? 0) + 1;
      await admin.from("delivery_batches").update({ dispatch_retry_count: newCount, last_dispatch_attempt_at: new Date().toISOString() }).eq("id", batch.id);
      if (newCount > 1 && newCount % 10 === 0) toNotify.push({ id: batch.id, retry_count: newCount });
    }
  }

  if (toNotify.length) await notifyAdmins(admin, toNotify);

  return json({ success: true, reassigned, notified: toNotify.length });
});

async function notifyAdmins(admin: ReturnType<typeof createClient>, items: { id: string; retry_count: number }[]) {
  try {
    const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
    if (!admins?.length) return;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return;
    const emails: string[] = [];
    for (const a of admins) {
      const { data: u } = await admin.auth.admin.getUserById(a.id);
      if (u?.user?.email) emails.push(u.user.email);
    }
    if (!emails.length) return;
    const rows = items.map((o) => `<li>${o.id} -- stuck ${o.retry_count} minutes</li>`).join("");
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_ADDRESS, to: emails, subject: `${items.length} delivery(ies) still without a rider`,
        html: `<p>These orders/batches still have no available rider after repeated retries:</p><ul>${rows}</ul>`,
      }),
    });
  } catch (e) {
    console.error("CRON_NOTIFY_FAILED", e);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
