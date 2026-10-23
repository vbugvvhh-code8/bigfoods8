import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
type ServiceLocation = { state: string; lga: string; is_active: boolean };
function areAllServiceAreasActive(
  restaurants: { state?: string | null; zone?: string | null }[],
  locations: ServiceLocation[],
) {
  if (!restaurants.length) return false;
  const lgaCounts = new Map<string, number>();
  for (const location of locations) lgaCounts.set(location.lga, (lgaCounts.get(location.lga) ?? 0) + 1);
  const canonicalZone = (location: ServiceLocation) =>
    (lgaCounts.get(location.lga) ?? 0) > 1 ? `${location.lga} (${location.state})` : location.lga;
  return restaurants.every((restaurant) =>
    !!restaurant.state && !!restaurant.zone && locations.some((location) =>
      location.state === restaurant.state && canonicalZone(location) === restaurant.zone && location.is_active === true
    )
  );
}

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

    const { groups, delivery_address, delivery_lat, delivery_lng, delivery_note, tip_amount, callbackOrigin, payment_mode } = await req.json();
    if (payment_mode != null && payment_mode !== 'link') return json({ error: 'Invalid payment mode.' }, 400);
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
    if (requestedRestaurantIds.some((id: unknown) => typeof id !== "string" || id.length === 0)) {
      return json({ error: "Each restaurant group must have a valid restaurant ID" }, 400);
    }
    if (new Set(requestedRestaurantIds).size !== requestedRestaurantIds.length) {
      return json({ error: "Each restaurant can appear only once in checkout" }, 400);
    }
    if (!PAYSTACK_SECRET_KEY) return json({ error: "Payments aren't configured yet." }, 502);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const restaurantIds = groups.map((g: any) => g.restaurant_id);
    const { data: restaurants, error: restaurantsError } = await admin
      .from("restaurants")
      .select("id, latitude, longitude, is_accepting_orders, zone, state, delivery_radius_km")
      .in("id", restaurantIds);
    if (restaurantsError) return json({ error: "Unable to validate restaurant information. Please try again later." }, 503);
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
      const seenLineKeys = new Set<string>();
      for (const item of g.items) {
        if (
          !item || typeof item.menu_item_id !== "string" ||
          !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 ||
          (item.selected_options != null && !Array.isArray(item.selected_options))
        ) {
          return json({ error: "Cart items must have valid IDs, quantities between 1 and 99, and valid option selections" }, 400);
        }
        const selections = Array.isArray(item.selected_options) ? item.selected_options : [];
        if (selections.some((selection: any) => !selection || typeof selection.group_id !== "string" || typeof selection.option_id !== "string")) {
          return json({ error: "One or more selected options are invalid. Please review your cart." }, 400);
        }
        const optionSignature = selections.map((selection: any) => `${selection.group_id}:${selection.option_id}`).sort().join(",");
        const lineKey = `${item.menu_item_id}|${optionSignature}`;
        if (seenLineKeys.has(lineKey)) {
          return json({ error: "Duplicate cart lines found. Please refresh your cart and try again." }, 400);
        }
        seenLineKeys.add(lineKey);
      }
      itemCount += g.items.length;
      if (itemCount > 100) return json({ error: "Your cart contains too many items" }, 400);

      const uniqueMenuItemIds = [...new Set(g.items.map((i: any) => i.menu_item_id))];
      const { data: menuItems, error: itemsError } = await admin
        .from("menu_items")
        .select("id, price, restaurant_id, is_available, option_groups")
        .in("id", uniqueMenuItemIds);
      if (itemsError) return json({ error: "Unable to validate cart items. Please try again later." }, 503);
      const invalid = menuItems?.find((m: any) => m.restaurant_id !== g.restaurant_id);
      if (invalid || menuItems?.length !== uniqueMenuItemIds.length) {
        return json({ error: "One or more items don't belong to their restaurant" }, 400);
      }
      const unavailableItem = menuItems?.find((m: any) => m.is_available === false);
      if (unavailableItem) {
        return json({ error: "One or more items in your cart are currently unavailable. Remove them and try again." }, 409);
      }
      const menuItemById = new Map((menuItems ?? []).map((m: any) => [m.id, m]));
      const pricedItems: any[] = [];
      for (const i of g.items) {
        const menuItem = menuItemById.get(i.menu_item_id) as any;
        const rawPrice = Number(menuItem?.price);
        if (!Number.isFinite(rawPrice) || rawPrice <= 0) throw new Error("Invalid menu item price");
        const basePrice = Math.round(rawPrice);
        const optionGroups = Array.isArray(menuItem?.option_groups) ? menuItem.option_groups : [];
        if (optionGroups.some((group: any) =>
          !group || typeof group.id !== "string" || typeof group.name !== "string" ||
          !Array.isArray(group.options) || !["single", "multiple"].includes(group.selection_type) ||
          group.options.some((option: any) => !option || typeof option.id !== "string" || typeof option.name !== "string" ||
            !Number.isSafeInteger(Number(option.price)) || Number(option.price) < 0)
        )) {
          return json({ error: "A menu item's option setup is invalid. Please contact the restaurant." }, 409);
        }
        const selections = Array.isArray(i.selected_options) ? i.selected_options : [];
        const selectionKeys = new Set<string>();
        const selectedSnapshots: any[] = [];
        const countsByGroup = new Map<string, number>();

        for (const selection of selections) {
          const key = `${selection.group_id}:${selection.option_id}`;
          if (selectionKeys.has(key)) return json({ error: "Duplicate options selected. Please review your cart." }, 400);
          selectionKeys.add(key);
          const optionGroup = optionGroups.find((group: any) => group?.id === selection.group_id);
          const option = optionGroup?.options?.find((candidate: any) => candidate?.id === selection.option_id);
          if (!optionGroup || !option || option.is_available === false) {
            return json({ error: "One of your selected options is no longer available. Please update your cart." }, 409);
          }
          const optionPrice = Number(option.price);
          if (!Number.isSafeInteger(optionPrice) || optionPrice < 0 || typeof option.name !== "string" || typeof optionGroup.name !== "string") {
            return json({ error: "A menu option has invalid pricing. Please contact the restaurant." }, 409);
          }
          countsByGroup.set(optionGroup.id, (countsByGroup.get(optionGroup.id) ?? 0) + 1);
          selectedSnapshots.push({
            groupId: optionGroup.id,
            groupName: optionGroup.name,
            optionId: option.id,
            optionName: option.name,
            price: optionPrice,
          });
        }

        for (const optionGroup of optionGroups) {
          if (!optionGroup || typeof optionGroup.id !== "string" || !Array.isArray(optionGroup.options)) {
            return json({ error: "A menu item's option setup is invalid. Please contact the restaurant." }, 409);
          }
          const count = countsByGroup.get(optionGroup.id) ?? 0;
          const minimum = optionGroup.required ? Math.max(1, Number(optionGroup.min_select ?? 1)) : Number(optionGroup.min_select ?? 0);
          const maximum = optionGroup.selection_type === "single" ? 1 : Number(optionGroup.max_select ?? optionGroup.options.length);
          if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum < 0 || maximum < minimum || maximum > optionGroup.options.length || minimum > optionGroup.options.length || count < minimum || count > maximum) {
            return json({ error: `Please review your selection for "${optionGroup.name || "menu options"}".` }, 400);
          }
        }

        const unitPrice = basePrice + selectedSnapshots.reduce((sum, option) => sum + option.price, 0);
        if (!Number.isSafeInteger(unitPrice) || unitPrice <= 0) return json({ error: "Cart item price is invalid." }, 400);
        pricedItems.push({
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
          unit_price: unitPrice,
          selected_options: selectedSnapshots,
        });
      }
      const subtotal = pricedItems.reduce((sum: number, i: any) => sum + i.unit_price * i.quantity, 0);
      if (!Number.isSafeInteger(subtotal) || subtotal < 0) {
        return json({ error: "Cart subtotal is invalid. Please refresh your cart." }, 400);
      }
      groupComputations.push({
        restaurant_id: g.restaurant_id,
        subtotal,
        items: pricedItems,
      });
    }

    const rawTipAmount = Number(tip_amount ?? 0);
    if (!Number.isFinite(rawTipAmount) || rawTipAmount < 0 || rawTipAmount > 1000000) {
      return json({ error: "Tip amount must be a valid non-negative amount." }, 400);
    }
    const tipAmount = Math.round(rawTipAmount);

    // Orders are kept non-active until Paystack verifies success.
    // ---- Single restaurant: exactly the existing behavior, no group/batch at all ----
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
        order_id: order.id, menu_item_id: i.menu_item_id, quantity: i.quantity ?? 1, unit_price: i.unit_price, selected_options: i.selected_options ?? [],
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

      if (payment_mode === "link") return json({ success: true, payment_link_ready: true, order_id: order.id, reference });
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
    // Each restaurant is its own delivery: separate rider assignment and drop-off code.
    const batches = clusterable.map((restaurant) => [restaurant]);

    let totalAmount = groupComputations.reduce((s, g) => s + g.subtotal, 0) + platformFee * groups.length;
    const batchPlans = batches.map((batchRestaurants) => {
      const { sequence } = sequenceRoute(batchRestaurants, delivery_lat, delivery_lng);
      // Match checkout's displayed delivery estimate: charge each restaurant's
      // restaurant-to-customer distance, with the configured minimum per restaurant.
      // A shared rider batch must not silently reduce the amount shown at checkout.
      const deliveryFee = batchRestaurants.reduce((sum, restaurant) => {
        const distanceKm = haversineKm(
          restaurant.latitude,
          restaurant.longitude,
          delivery_lat,
          delivery_lng,
        );
        return sum + Math.max(Math.round(distanceKm * rate), minDeliveryFee);
      }, 0);
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
          order_id: order.id, menu_item_id: i.menu_item_id, quantity: i.quantity ?? 1, unit_price: i.unit_price, selected_options: i.selected_options ?? [],
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

    if (payment_mode === "link") return json({ success: true, payment_link_ready: true, order_group_id: group.id, reference });
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
