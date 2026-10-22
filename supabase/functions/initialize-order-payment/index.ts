import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { areAllServiceAreasActive, type ServiceLocation } from "../_shared/service-area.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RESTAURANTS_PER_BATCH = 3;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Greedily buckets restaurants into batches of up to 3, each batch built
// around geographic proximity rather than arbitrarily -- pick a seed, pull
// in its nearest unclustered neighbors until the batch is full or nothing's
// left, repeat. Not a globally-optimal clustering, but reasonable for cart
// sizes this app will realistically see.
function clusterRestaurants(restaurants: { id: string; latitude: number; longitude: number }[]) {
  const remaining = [...restaurants];
  const batches: typeof restaurants[] = [];
  while (remaining.length) {
    const seed = remaining.shift()!;
    const batch = [seed];
    remaining.sort((a, b) => haversineKm(seed.latitude, seed.longitude, a.latitude, a.longitude) - haversineKm(seed.latitude, seed.longitude, b.latitude, b.longitude));
    while (batch.length < MAX_RESTAURANTS_PER_BATCH && remaining.length) {
      batch.push(remaining.shift()!);
    }
    batches.push(batch);
  }
  return batches;
}

// Nearest-neighbor route through a batch's restaurants, ending at the
// customer -- not true TSP-optimal, but a reasonable, cheap approximation.
function sequenceRoute(
  restaurants: { id: string; latitude: number; longitude: number }[],
  destLat: number,
  destLng: number
) {
  const unvisited = [...restaurants];
  const sequence: string[] = [];
  let totalKm = 0;
  let currentLat = unvisited[0].latitude;
  let currentLng = unvisited[0].longitude;

  while (unvisited.length) {
    unvisited.sort((a, b) => haversineKm(currentLat, currentLng, a.latitude, a.longitude) - haversineKm(currentLat, currentLng, b.latitude, b.longitude));
    const next = unvisited.shift()!;
    if (sequence.length > 0) totalKm += haversineKm(currentLat, currentLng, next.latitude, next.longitude);
    sequence.push(next.id);
    currentLat = next.latitude;
    currentLng = next.longitude;
  }
  totalKm += haversineKm(currentLat, currentLng, destLat, destLng);
  return { sequence, totalKm };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: "Not authenticated" }, 401);
    const customerId = userData.user.id;
    const customerEmail = userData.user.email;

    const { groups, delivery_address, delivery_lat, delivery_lng, delivery_note, tip_amount, callbackOrigin } = await req.json();
    if (!Array.isArray(groups) || groups.length === 0) {
      return json({ error: "At least one restaurant group is required" }, 400);
    }
    if (
      typeof delivery_lat !== "number" ||
      typeof delivery_lng !== "number" ||
      !Number.isFinite(delivery_lat) ||
      !Number.isFinite(delivery_lng) ||
      delivery_lat < -90 || delivery_lat > 90 ||
      delivery_lng < -180 || delivery_lng > 180
    ) {
      return json({ error: "A valid delivery latitude and longitude are required" }, 400);
    }
    if (groups.some((g: any) => !g || typeof g.restaurant_id !== "string" || !Array.isArray(g.items) || g.items.length === 0)) {
      return json({ error: "Each restaurant group must include a restaurant and at least one item" }, 400);
    }
    const requestedRestaurantIds = groups.map((g: any) => g.restaurant_id);
    if (new Set(requestedRestaurantIds).size !== requestedRestaurantIds.length) {
      return json({ error: "Each restaurant can appear only once in checkout" }, 400);
    }
    if (!PAYSTACK_SECRET_KEY) return json({ error: "Payments aren't configured yet." }, 502);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const restaurantIds = groups.map((g: any) => g.restaurant_id);
    const { data: restaurants } = await admin
      .from("restaurants")
      .select("id, latitude, longitude, is_accepting_orders, zone, state, delivery_radius_km")
      .in("id", restaurantIds);
    if (!restaurants || restaurants.length !== restaurantIds.length) {
      return json({ error: "One or more restaurants weren't found" }, 404);
    }
    const notAccepting = restaurants.find((r) => !r.is_accepting_orders);
    if (notAccepting) return json({ error: "One of the restaurants in your cart isn't accepting orders right now" }, 400);
    const missingLocation = restaurants.find((r) => r.latitude == null || r.longitude == null);
    if (missingLocation) return json({ error: "One of the restaurants doesn't have its location set up yet" }, 400);

    // Enforce admin-controlled active delivery areas at the payment boundary.
    const { data: serviceLocations, error: serviceLocationsError } = await admin
      .from("locations")
      .select("state, lga, is_active");
    if (serviceLocationsError || !serviceLocations) {
      return json({ error: "Unable to verify active delivery coverage. Please try again later." }, 503);
    }
    if (!areAllServiceAreasActive(
      restaurants.map((restaurant) => ({ state: restaurant.state, zone: restaurant.zone })),
      serviceLocations as ServiceLocation[],
    )) {
      return json({ error: "One or more restaurants are outside an active delivery area" }, 400);
    }

    // Require the pinned delivery point to fall within any configured radius.
    const outsideDeliveryRadius = restaurants.find((restaurant) => {
      if (restaurant.delivery_radius_km == null) return false;
      const radius = Number(restaurant.delivery_radius_km);
      if (!Number.isFinite(radius) || radius <= 0) return true;
      return haversineKm(restaurant.latitude, restaurant.longitude, delivery_lat, delivery_lng) > radius;
    });
    if (outsideDeliveryRadius) {
      return json({ error: "Your delivery location is outside one or more restaurants' delivery range" }, 400);
    }

    const { data: pricingRows, error: pricingError } = await admin
      .from("pricing_config")
      .select("key, value")
      .in("key", ["platform_fee", "delivery_rate_per_km", "minimum_delivery_fee"]);
    if (pricingError || !pricingRows) {
      return json({ error: "Unable to load checkout pricing. Please try again later." }, 503);
    }

    const pricingValue = (key: string) => {
      const row = pricingRows.find((p: any) => p.key === key);
      return row?.value;
    };
    const rawPlatformFee = pricingValue("platform_fee");
    const rawRate = pricingValue("delivery_rate_per_km");
    const rawMinDeliveryFee = pricingValue("minimum_delivery_fee");
    const platformFee = Number(rawPlatformFee);
    const rate = Number(rawRate);
    const minDeliveryFee = Number(rawMinDeliveryFee);
    if (
      rawPlatformFee == null || rawRate == null || rawMinDeliveryFee == null ||
      !Number.isFinite(platformFee) || platformFee < 0 ||
      !Number.isFinite(rate) || rate < 0 ||
      !Number.isFinite(minDeliveryFee) || minDeliveryFee < 0
    ) {
      return json({ error: "Checkout pricing is not configured correctly. Please contact support." }, 503);
    }
    if (![platformFee, rate, minDeliveryFee].every(Number.isSafeInteger)) {
      return json({ error: "Checkout pricing must be configured in whole naira amounts." }, 503);
    }

    // Validate all cart data at the payment boundary, then calculate prices from
    // database-owned menu prices rather than browser-supplied totals or prices.
    const groupComputations: { restaurant_id: string; subtotal: number; items: any[] }[] = [];
    let itemCount = 0;
    for (const g of groups) {
      if (!g || typeof g.restaurant_id !== "string" || !Array.isArray(g.items) || g.items.length === 0) {
        return json({ error: "Each restaurant group must include at least one cart item" }, 400);
      }
      const seenItemIds = new Set<string>();
      for (const item of g.items) {
        if (
          !item || typeof item.menu_item_id !== "string" ||
          !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 ||
          seenItemIds.has(item.menu_item_id)
        ) {
          return json({ error: "Cart items must have unique item IDs and quantities between 1 and 99" }, 400);
        }
        seenItemIds.add(item.menu_item_id);
      }
      itemCount += g.items.length;
      if (itemCount > 100) return json({ error: "Your cart contains too many items" }, 400);

      const { data: menuItems, error: itemsError } = await admin
        .from("menu_items")
        .select("id, price, restaurant_id")
        .in("id", g.items.map((i: any) => i.menu_item_id));
      if (itemsError) return json({ error: "Unable to validate cart items. Please try again later." }, 503);
      const invalid = menuItems?.find((m: any) => m.restaurant_id !== g.restaurant_id);
      if (invalid || menuItems?.length !== g.items.length) {
        return json({ error: "One or more items don't belong to their restaurant" }, 400);
      }
      const menuItemById = new Map((menuItems ?? []).map((m: any) => [m.id, m]));
      const subtotal = g.items.reduce((sum: number, i: any) => {
        const menuItem = menuItemById.get(i.menu_item_id) as any;
        const unitPrice = Number(menuItem?.price);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error("Invalid menu item price");
        return sum + unitPrice * i.quantity;
      }, 0);
      if (!Number.isSafeInteger(Math.round(subtotal)) || subtotal < 0) {
        return json({ error: "Cart subtotal is invalid. Please refresh your cart." }, 400);
      }
      groupComputations.push({
        restaurant_id: g.restaurant_id,
        subtotal: Math.round(subtotal),
        items: g.items.map((i: any) => ({
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
          unit_price: Number(menuItemById.get(i.menu_item_id)!.price),
        })),
      });
    }

    const rawTipAmount = Number(tip_amount ?? 0);
    if (!Number.isFinite(rawTipAmount) || rawTipAmount < 0 || rawTipAmount > 1000000) {
      return json({ error: "Tip amount must be a valid non-negative amount." }, 400);
    }
    const tipAmount = Math.round(rawTipAmount);

    // Orders are kept non-active (cancelled placeholder) until Paystack verifies success.\n    // verify-order-payment promotes them to placed only after provider confirmation.\n    // ---- Single restaurant: exactly the existing behavior, no group/batch at all ----
    if (groups.length === 1) {
      const restaurant = restaurants[0];
      const distanceKm = haversineKm(restaurant.latitude, restaurant.longitude, delivery_lat, delivery_lng);
      const deliveryFee = Math.max(Math.round(distanceKm * rate), minDeliveryFee);
      const totalAmount = groupComputations[0].subtotal + platformFee + deliveryFee + tipAmount;
      const deliveryCode = Math.floor(1000 + Math.random() * 9000).toString();

      const { data: order, error: orderError } = await admin
        .from("orders")
        .insert({
          restaurant_id: restaurant.id,
          customer_id: customerId,
          rider_id: null,
          zone: restaurant.zone,
          status: "cancelled",
          payment_status: "pending",
          subtotal: groupComputations[0].subtotal,
          platform_fee: platformFee,
          delivery_fee: deliveryFee,
          tip_amount: tipAmount,
          delivery_address: delivery_address ?? null,
          delivery_lat,
          delivery_lng,
          delivery_code: deliveryCode,
        })
        .select()
        .single();
      if (orderError) return json({ error: orderError.message }, 500);

      const orderItemsPayload = groupComputations[0].items.map((i: any) => ({
        order_id: order.id, menu_item_id: i.menu_item_id, quantity: i.quantity ?? 1, unit_price: i.unit_price,
      }));
      const { error: itemsInsertError } = await admin.from("order_items").insert(orderItemsPayload);
      if (itemsInsertError) {
        await admin.from("orders").delete().eq("id", order.id);
        return json({ error: itemsInsertError.message }, 500);
      }

      const reference = crypto.randomUUID();
      const { error: txnError } = await admin.from("transactions").insert({
        order_id: order.id, type: "order_payment", amount: totalAmount, status: "pending", reference,
        restaurant_id: restaurant.id, customer_id: customerId,
      });
      if (txnError) {
        await admin.from("orders").delete().eq("id", order.id);
        return json({ error: txnError.message }, 500);
      }

      const authUrl = await startPaystack(customerEmail, totalAmount, reference, callbackOrigin, { order_id: order.id, type: "order_payment" });
      if ("error" in authUrl) {
        await admin.from("transactions").update({ status: "failed" }).eq("reference", reference);
        return json({ error: authUrl.error }, 502);
      }
      return json({ success: true, authorization_url: authUrl.url, order_id: order.id, reference });
    }

    // ---- Multi-restaurant: order_group + up-to-3-restaurant delivery_batches ----
    const restaurantById = new Map(restaurants.map((r) => [r.id, r]));
    const clusterable = restaurants.map((r) => ({ id: r.id, latitude: r.latitude!, longitude: r.longitude! }));
    const batches = clusterRestaurants(clusterable);

    let totalAmount = groupComputations.reduce((s, g) => s + g.subtotal, 0) + platformFee * groups.length;
    const batchPlans = batches.map((batchRestaurants) => {
      const { sequence, totalKm } = sequenceRoute(batchRestaurants, delivery_lat, delivery_lng);
      const deliveryFee = Math.max(Math.round(totalKm * rate), minDeliveryFee);
      totalAmount += deliveryFee;
      return { sequence, deliveryFee };
    });
    // Tip splits evenly across however many separate deliveries this becomes.
    const tipPerBatch = batchPlans.length ? Math.floor(tipAmount / batchPlans.length) : 0;
    const tipRemainder = batchPlans.length ? tipAmount - tipPerBatch * batchPlans.length : 0;
    totalAmount += tipAmount;

    const { data: group, error: groupError } = await admin
      .from("order_groups")
      .insert({
        customer_id: customerId,
        delivery_address: delivery_address ?? null,
        delivery_lat,
        delivery_lng,
        delivery_note: delivery_note ?? null,
        payment_status: "pending",
        total_amount: totalAmount,
      })
      .select()
      .single();
    if (groupError) return json({ error: groupError.message }, 500);

    for (const [planIndex, plan] of batchPlans.entries()) {
      const batchTip = tipPerBatch + (planIndex < tipRemainder ? 1 : 0);
      const deliveryCode = Math.floor(1000 + Math.random() * 9000).toString();
      const { data: batch, error: batchError } = await admin
        .from("delivery_batches")
        .insert({
          order_group_id: group.id,
          status: "assigning",
          delivery_code: deliveryCode,
          delivery_fee: plan.deliveryFee,
          tip_amount: batchTip,
          route_sequence: plan.sequence,
        })
        .select()
        .single();
      if (batchError) {
        await admin.from("order_groups").delete().eq("id", group.id);
        return json({ error: batchError.message }, 500);
      }

      for (const restaurantId of plan.sequence) {
        const restaurant = restaurantById.get(restaurantId)!;
        const groupComp = groupComputations.find((g) => g.restaurant_id === restaurantId)!;
        const { data: order, error: orderError } = await admin
          .from("orders")
          .insert({
            restaurant_id: restaurantId,
            customer_id: customerId,
            rider_id: null,
            zone: restaurant.zone,
            status: "cancelled",
            payment_status: "pending",
            subtotal: groupComp.subtotal,
            platform_fee: platformFee,
            delivery_fee: 0, // lives on the batch, not the individual leg
            tip_amount: 0, // lives on the batch
            delivery_address: delivery_address ?? null,
            delivery_lat,
            delivery_lng,
            delivery_code: null, // the batch's code is what's actually used at drop-off
            order_group_id: group.id,
            delivery_batch_id: batch.id,
          })
          .select()
          .single();
        if (orderError) {
          await admin.from("order_groups").delete().eq("id", group.id);
          return json({ error: orderError.message }, 500);
        }
        const itemsPayload = groupComp.items.map((i: any) => ({
          order_id: order.id, menu_item_id: i.menu_item_id, quantity: i.quantity ?? 1, unit_price: i.unit_price,
        }));
        const { error: itemsErr } = await admin.from("order_items").insert(itemsPayload);
        if (itemsErr) {
          await admin.from("order_groups").delete().eq("id", group.id);
          return json({ error: itemsErr.message }, 500);
        }
      }
    }

    const reference = crypto.randomUUID();
    const { error: txnError } = await admin.from("transactions").insert({
      order_group_id: group.id, type: "order_payment", amount: totalAmount, status: "pending", reference, customer_id: customerId,
    });
    if (txnError) {
      await admin.from("order_groups").delete().eq("id", group.id);
      return json({ error: txnError.message }, 500);
    }

    const authUrl = await startPaystack(customerEmail, totalAmount, reference, callbackOrigin, { order_group_id: group.id, type: "order_payment" });
    if ("error" in authUrl) {
      await admin.from("transactions").update({ status: "failed" }).eq("reference", reference);
      return json({ error: authUrl.error }, 502);
    }

    return json({ success: true, authorization_url: authUrl.url, order_group_id: group.id, reference, batch_count: batchPlans.length });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

async function startPaystack(email: string | undefined, amount: number, reference: string, callbackOrigin: string | undefined, metadata: Record<string, unknown>) {
  const origin = callbackOrigin || "https://bigfoods.app";
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email, amount: amount * 100, reference,
      callback_url: `${origin}/order/checkout/callback`,
      metadata,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.status) return { error: data.message ?? "Could not start payment" };
  return { url: data.data.authorization_url };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
