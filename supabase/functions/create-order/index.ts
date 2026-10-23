import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isCanonicalActiveServiceArea } from "../_shared/service-area.ts";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: "Not authenticated" }, 401);
    const customerId = userData.user.id;

    const { restaurant_id, items, delivery_address, delivery_lat, delivery_lng, tip_amount } = await req.json();
    if (!restaurant_id || !Array.isArray(items) || items.length === 0) {
      return json({ error: "restaurant_id and at least one item are required" }, 400);
    }
    if (typeof delivery_lat !== "number" || typeof delivery_lng !== "number") {
      return json({ error: "delivery_lat and delivery_lng are required" }, 400);
    }

    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .select("id, latitude, longitude, is_accepting_orders, zone, state")
      .eq("id", restaurant_id)
      .single();
    if (restError || !restaurant) return json({ error: "Restaurant not found" }, 404);
    if (!restaurant.is_accepting_orders) return json({ error: "This restaurant is not accepting orders right now" }, 400);

    // The restaurant zone is the canonical zoneKey: plain LGA unless that name
    // occurs in multiple states, in which case it is "LGA (State)".
    if (!restaurant.state || !restaurant.zone) {
      return json({ error: "Restaurant service area is not configured" }, 400);
    }
    // Use the service-role client only for this server-side coverage check so
    // duplicate LGA names are evaluated across active and inactive locations.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: serviceLocations, error: locationError } = await admin
      .from("locations")
      .select("state, lga, is_active");
    if (locationError || !serviceLocations) {
      return json({ error: "Unable to verify service coverage" }, 503);
    }
    if (!isCanonicalActiveServiceArea(restaurant.state, restaurant.zone, serviceLocations)) {
      return json({ error: "This restaurant's delivery area is not currently active or uses an invalid zone key" }, 400);
    }

    if (restaurant.latitude == null || restaurant.longitude == null) {
      return json({ error: "Restaurant location is not set up yet" }, 400);
    }

    const { data: menuItems, error: itemsError } = await supabase
      .from("menu_items")
      .select("id, price, restaurant_id, is_available")
      .in("id", items.map((i: any) => i.menu_item_id));
    if (itemsError) return json({ error: itemsError.message }, 500);

    const invalidItem = menuItems?.find((m: any) => m.restaurant_id !== restaurant_id);
    if (invalidItem || menuItems?.length !== items.length) {
      return json({ error: "One or more items don't belong to this restaurant" }, 400);
    }
    const unavailableItem = menuItems?.find((m: any) => m.is_available === false);
    if (unavailableItem) {
      return json({ error: "One or more items in your cart are currently unavailable. Remove them and try again." }, 409);
    }

    const subtotal = items.reduce((sum: number, i: any) => {
      const menuItem = menuItems.find((m: any) => m.id === i.menu_item_id);
      return sum + (menuItem?.price ?? 0) * (i.quantity ?? 1);
    }, 0);

    const { data: pricingRows } = await supabase
      .from("pricing_config")
      .select("key, value")
      .in("key", ["platform_fee", "delivery_rate_per_km"]);
    const platformFee = Number(pricingRows?.find((p: any) => p.key === "platform_fee")?.value ?? 500);
    const rate = Number(pricingRows?.find((p: any) => p.key === "delivery_rate_per_km")?.value ?? 150);

    const distanceKm = haversineKm(restaurant.latitude, restaurant.longitude, delivery_lat, delivery_lng);
    const deliveryFee = Math.round(distanceKm * rate);

    // Consolidated on the platform-wide show_seed_data toggle, and now
    // requires approval_status='approved' -- both were missing here even
    // though the reassignment/retry paths already enforced them, which meant
    // a suspended/pending rider or a hidden seed rider could still receive a
    // brand-new real order at initial dispatch.
    const { data: seedSetting } = await supabase.from("platform_settings").select("value").eq("key", "show_seed_data").maybeSingle();
    const includeSeed = seedSetting?.value === true || seedSetting?.value === "true" || seedSetting === null;

    let riderQuery = supabase
      .from("riders")
      .select("id, lat, lng")
      .eq("status", "online")
      .eq("approval_status", "approved")
      .eq("zone", restaurant.zone)
      .not("lat", "is", null);
    if (!includeSeed) riderQuery = riderQuery.eq("is_seed_data", false);

    const { data: onlineRiders } = await riderQuery;

    let nearestRiderId: string | null = null;
    let nearestDistance = Infinity;
    for (const r of onlineRiders ?? []) {
      const d = haversineKm(restaurant.latitude, restaurant.longitude, r.lat, r.lng);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearestRiderId = r.id;
      }
    }

    const deliveryCode = Math.floor(1000 + Math.random() * 9000).toString();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        restaurant_id,
        customer_id: customerId,
        rider_id: nearestRiderId,
        zone: restaurant.zone,
        status: "placed",
        subtotal,
        platform_fee: platformFee,
        delivery_fee: deliveryFee,
        tip_amount: tip_amount ?? 0,
        delivery_address: delivery_address ?? null,
        delivery_lat,
        delivery_lng,
        delivery_code: deliveryCode,
      })
      .select()
      .single();
    if (orderError) return json({ error: orderError.message }, 500);

    const orderItemsPayload = items.map((i: any) => {
      const menuItem = menuItems.find((m: any) => m.id === i.menu_item_id);
      return { order_id: order.id, menu_item_id: i.menu_item_id, quantity: i.quantity ?? 1, unit_price: menuItem?.price ?? 0 };
    });
    const { error: orderItemsError } = await supabase.from("order_items").insert(orderItemsPayload);
    if (orderItemsError) return json({ error: orderItemsError.message }, 500);

    return json({
      success: true,
      order_id: order.id,
      delivery_code: deliveryCode,
      subtotal,
      platform_fee: platformFee,
      delivery_fee: deliveryFee,
      rider_assigned: !!nearestRiderId,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
