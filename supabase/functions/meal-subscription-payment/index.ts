import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function haversineKm(lat1:number,lng1:number,lat2:number,lng2:number) {
  const toRad=(value:number)=>value*Math.PI/180;
  const dLat=toRad(lat2-lat1), dLng=toRad(lng2-lng1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function getDeliveryDates(days: number[], weeks: number) {
  const dates: string[] = [];
  // The schedule is a Lagos-local calendar schedule, not a UTC schedule.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? '';
  const cursor = new Date(Date.UTC(Number(part('year')), Number(part('month')) - 1, Number(part('day')) + 1));
  const limit = new Date(cursor);
  limit.setUTCDate(limit.getUTCDate() + weeks * 7 + 7);
  for (let d = new Date(cursor); d <= limit && dates.length < days.length * weeks; d.setUTCDate(d.getUTCDate() + 1)) {
    const isoDay = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    if (days.includes(isoDay)) dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Sign in to manage a meal package." }, 401);
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Not authenticated" }, 401);
    const admin = createClient(url, serviceKey);
    const body = await req.json();
    const action = body.action;

    if (action === "initialize") {
      const restaurantId = String(body.restaurant_id ?? "");
      const packageWeeks = Number(body.package_weeks);
      const days = Array.from(new Set((Array.isArray(body.delivery_days) ? body.delivery_days : []).map(Number))).filter((d:number) => Number.isInteger(d) && d >= 1 && d <= 7).sort((a:number,b:number)=>a-b);
      const deliveryTime = String(body.delivery_time ?? "lunch");
      const rawItems = Array.isArray(body.items) ? body.items : [];
      if (!restaurantId || !Number.isInteger(packageWeeks) || packageWeeks < 1 || packageWeeks > 12 || !days.length || !["breakfast","lunch","dinner"].includes(deliveryTime) || !rawItems.length) return json({ error: "Choose a kitchen, package duration, at least one delivery day, meal time and menu item." }, 400);
      const { data: restaurant, error: restaurantError } = await admin.from("restaurants").select("id,name,owner_id,approval_status,is_accepting_orders,latitude,longitude,delivery_radius_km").eq("id", restaurantId).maybeSingle();
      if (restaurantError || !restaurant || restaurant.approval_status !== "approved" || restaurant.is_accepting_orders === false) return json({ error: "This kitchen is not currently accepting subscription orders." }, 400);
      if (restaurant.owner_id === user.id) return json({ error: "Restaurant owners cannot subscribe to their own kitchen." }, 403);
      const addressId = String(body.saved_address_id ?? "");
      const { data: savedAddress, error: addressError } = await admin.from("saved_addresses")
        .select("id,address,lat,lng,label").eq("id", addressId).eq("customer_id", user.id).maybeSingle();
      if (addressError || !savedAddress || savedAddress.lat == null || savedAddress.lng == null) {
        return json({ error: "Choose a saved delivery address with a map location before subscribing." }, 400);
      }
      if (restaurant.latitude == null || restaurant.longitude == null) return json({ error: "This kitchen has no verified delivery location yet." }, 400);
      const distanceKm = haversineKm(Number(restaurant.latitude), Number(restaurant.longitude), Number(savedAddress.lat), Number(savedAddress.lng));
      if (restaurant.delivery_radius_km != null && distanceKm > Number(restaurant.delivery_radius_km)) return json({ error: "Your saved address is outside this kitchen's delivery range." }, 400);
      const { data: pricingRows, error: pricingError } = await admin.from("pricing_config").select("key,value").in("key", ["platform_fee","delivery_rate_per_km","minimum_delivery_fee"]);
      if (pricingError || !pricingRows) return json({ error: "Unable to load delivery pricing. Please try again later." }, 503);
      const pricing = (key: string) => Number(pricingRows.find((row:any)=>row.key===key)?.value);
      const platformFee = pricing("platform_fee");
      const deliveryRate = pricing("delivery_rate_per_km");
      const minimumDeliveryFee = pricing("minimum_delivery_fee");
      if (![platformFee,deliveryRate,minimumDeliveryFee].every(value=>Number.isSafeInteger(value)&&value>=0)) return json({ error: "Delivery pricing is not configured correctly." }, 503);
      const deliveryFee = Math.max(Math.round(distanceKm*deliveryRate),minimumDeliveryFee);
      const quantities = new Map<string,number>();
      for (const item of rawItems) {
        const id = String(item?.menu_item_id ?? "");
        const quantity = Number(item?.quantity);
        if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return json({ error: "Menu item quantities must be between 1 and 20." }, 400);
        quantities.set(id, (quantities.get(id) ?? 0) + quantity);
      }
      const { data: menu, error: menuError } = await admin.from("menu_items").select("id,name,price,promotional_price,promotion_starts_at,promotion_ends_at,is_available,admin_disabled,restaurant_id,option_groups").in("id", Array.from(quantities.keys())).eq("restaurant_id", restaurantId);
      if (menuError || !menu || menu.length !== quantities.size) return json({ error: "Some selected menu items are no longer available." }, 400);
      const now = Date.now();
      const selectedItems = [];
      let perDeliveryTotal = 0;
      for (const item of menu) {
        if (item.is_available === false || item.admin_disabled === true) return json({ error: item.name + " is currently unavailable." }, 409);
        const promoStart = item.promotion_starts_at ? new Date(item.promotion_starts_at).getTime() : -Infinity;
        const promoEnd = item.promotion_ends_at ? new Date(item.promotion_ends_at).getTime() : Infinity;
        const price = item.promotional_price != null && now >= promoStart && now <= promoEnd ? Number(item.promotional_price) : Number(item.price);
        if (!Number.isFinite(price) || price <= 0) return json({ error: "A selected item has an invalid price." }, 400);
        const quantity = quantities.get(item.id)!;
        const rawItem = rawItems.find((candidate:any) => String(candidate?.menu_item_id ?? "") === item.id);
        const submittedOptions = Array.isArray(rawItem?.selected_options) ? rawItem.selected_options : [];
        const configuredGroups = Array.isArray(item.option_groups) ? item.option_groups : [];
        const selectedOptions:any[] = [];
        for (const group of configuredGroups) {
          const submittedForGroup = submittedOptions.filter((option:any) => String(option?.groupId ?? "") === String(group.id));
          const chosen = submittedForGroup.filter((option:any) => Number(option?.quantity) > 0);
          const min = group.required ? Math.max(1, Number(group.min_select ?? 1)) : Number(group.min_select ?? 0);
          const max = group.selection_type === "single" ? 1 : Number(group.max_select ?? (Array.isArray(group.options) ? group.options.length : 0));
          if (chosen.length < min || chosen.length > max) return json({ error: "Please complete the required options for " + item.name + "." }, 400);
          for (const submitted of chosen) {
            const option = (Array.isArray(group.options) ? group.options : []).find((candidate:any) => String(candidate.id) === String(submitted.optionId));
            const optionQuantity = Number(submitted.quantity);
            if (!option || !Number.isInteger(optionQuantity) || optionQuantity < 1 || optionQuantity > 99 || option.is_available === false) return json({ error: "A selected variant for " + item.name + " is no longer available." }, 409);
            if (option.stock_quantity != null && Number(option.stock_quantity) - Number(option.stock_reserved ?? 0) < optionQuantity) return json({ error: "A selected variant for " + item.name + " is out of stock." }, 409);
            const optionPrice = Number(option.price ?? 0);
            if (!Number.isFinite(optionPrice) || optionPrice < 0) return json({ error: "A selected variant has an invalid price." }, 400);
            selectedOptions.push({ groupId: group.id, groupName: group.name, optionId: option.id, optionName: option.name, price: optionPrice, quantity: optionQuantity });
          }
        }
        const allowedOptionPairs = new Set(configuredGroups.flatMap((group:any) => (Array.isArray(group.options) ? group.options : []).map((option:any) => String(group.id) + ":" + String(option.id))));
        if (submittedOptions.some((option:any) => Number(option?.quantity) > 0 && !allowedOptionPairs.has(String(option?.groupId) + ":" + String(option?.optionId)))) return json({ error: "A selected variant does not belong to " + item.name + "." }, 400);
        const optionCost = selectedOptions.reduce((sum, option) => sum + option.price * option.quantity, 0);
        const unitPrice = price + optionCost;
        perDeliveryTotal += unitPrice * quantity;
        selectedItems.push({ menu_item_id: item.id, name: item.name, quantity, unit_price: unitPrice, base_unit_price: price, selected_options: selectedOptions });
      }
      const dates = getDeliveryDates(days, packageWeeks);
      if (!dates.length) return json({ error: "Could not generate your delivery schedule. Try again." }, 400);
      const perDeliveryTotalWithFees = perDeliveryTotal + platformFee + deliveryFee;
      const totalAmount = Math.round(perDeliveryTotalWithFees * dates.length * 100) / 100;
      const reference = crypto.randomUUID();
      const { data: subscription, error: insertError } = await admin.from("meal_subscriptions").insert({
        customer_id: user.id, restaurant_id: restaurantId, saved_address_id: savedAddress.id, delivery_address: savedAddress.address, delivery_lat: savedAddress.lat, delivery_lng: savedAddress.lng, package_weeks: packageWeeks,
        delivery_days: days, delivery_time: deliveryTime, selected_items: selectedItems,
        total_deliveries: dates.length, scheduled_dates: dates, meal_subtotal_per_delivery: perDeliveryTotal, platform_fee_per_delivery: platformFee, delivery_fee_per_delivery: deliveryFee, delivery_distance_km: distanceKm, total_amount: totalAmount, currency: "NGN",
        status: "pending_payment", payment_reference: reference, starts_on: dates[0], ends_on: dates[dates.length-1]
      }).select("id,total_amount,total_deliveries,starts_on,ends_on").single();
      if (insertError || !subscription) throw insertError ?? new Error("Could not create subscription.");
      if (!paystackKey) {
        await admin.from("meal_subscriptions").update({ status: "payment_failed" }).eq("id", subscription.id).eq("status", "pending_payment");
        return json({ error: "Payments are not configured yet." }, 502);
      }
      const paystack = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST", headers: { Authorization: "Bearer " + paystackKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, amount: Math.round(totalAmount * 100), reference, callback_url: (body.callback_origin || new URL(req.url).origin) + "/subscriptions?reference=" + encodeURIComponent(reference), metadata: { type: "meal_subscription", subscription_id: subscription.id, customer_id: user.id } })
      });
      const result = await paystack.json();
      if (!paystack.ok || !result?.status || !result?.data?.authorization_url) {
        await admin.from("meal_subscriptions").update({ status: "payment_failed" }).eq("id", subscription.id);
        return json({ error: result?.message ?? "Could not initialize payment." }, 502);
      }
      return json({ success: true, subscription_id: subscription.id, amount: totalAmount, total_deliveries: dates.length, starts_on: dates[0], ends_on: dates[dates.length-1], authorization_url: result.data.authorization_url, reference });
    }

    if (action === "verify") {
      const reference = String(body.reference ?? "");
      if (!reference) return json({ error: "Missing payment reference." }, 400);
      const { data: subscription, error: findError } = await admin.from("meal_subscriptions").select("*").eq("payment_reference", reference).eq("customer_id", user.id).maybeSingle();
      if (findError || !subscription) return json({ error: "Subscription payment not found." }, 404);
      if (subscription.status === "active" || subscription.status === "paused" || subscription.status === "completed") {
        // Repair a previous partial activation where the payment was confirmed
        // but schedule rows could not be inserted. This is safe to retry.
        const existingDates: string[] = Array.isArray(subscription.scheduled_dates)
          ? subscription.scheduled_dates.map((value: string) => String(value).slice(0, 10))
          : [];
        if (subscription.status !== "completed" && existingDates.length === subscription.total_deliveries) {
          const { error: repairError } = await admin.from("meal_subscription_deliveries").upsert(
            existingDates.map((date: string) => ({ subscription_id: subscription.id, scheduled_for: date, delivery_time: subscription.delivery_time })),
            { onConflict: "subscription_id,scheduled_for,delivery_time", ignoreDuplicates: true },
          );
          if (repairError) return json({ error: "Payment is confirmed but the delivery schedule needs support. Please contact BigFoods." }, 500);
        }
        return json({ success: true, subscription_id: subscription.id, status: subscription.status });
      }
      if (!paystackKey) return json({ error: "Payments are not configured." }, 502);
      const verify = await fetch("https://api.paystack.co/transaction/verify/" + encodeURIComponent(reference), { headers: { Authorization: "Bearer " + paystackKey } });
      const verified = await verify.json();
      if (!verify.ok || verified?.data?.status !== "success") {
        await admin.from("meal_subscriptions").update({ status: "payment_failed" }).eq("id", subscription.id).eq("status", "pending_payment");
        return json({ success: false, error: "Payment has not been confirmed." }, 400);
      }
      if (Number(verified?.data?.amount) !== Math.round(Number(subscription.total_amount) * 100)) return json({ error: "Paid amount does not match this package. Contact support." }, 400);
      const dates: string[] = Array.isArray(subscription.scheduled_dates) ? subscription.scheduled_dates.map((value: string) => String(value).slice(0,10)) : [];
      if (dates.length !== subscription.total_deliveries) return json({ error: "Saved schedule is incomplete. Contact support." }, 500);
      const { data: updated, error: updateError } = await admin.from("meal_subscriptions").update({ status: "active", paid_at: new Date().toISOString(), starts_on: dates[0], ends_on: dates[dates.length-1], updated_at: new Date().toISOString() }).eq("id", subscription.id).eq("status", "pending_payment").select("id");
      if (updateError) throw updateError;
      if (!updated?.length) {
        const { data: current } = await admin.from("meal_subscriptions").select("status").eq("id", subscription.id).single();
        return json({ success: current?.status === "active", subscription_id: subscription.id, status: current?.status });
      }
      const deliveries = dates.map((date:string) => ({ subscription_id: subscription.id, scheduled_for: date, delivery_time: subscription.delivery_time }));
      const { error: deliveryError } = await admin.from("meal_subscription_deliveries").upsert(deliveries, { onConflict: "subscription_id,scheduled_for,delivery_time", ignoreDuplicates: true });
      if (deliveryError) {
        await admin.from("meal_subscriptions").update({ status: "paused" }).eq("id", subscription.id);
        throw deliveryError;
      }
      return json({ success: true, subscription_id: subscription.id, status: "active", total_deliveries: deliveries.length });
    }
    if (action === "manage") {
      const subscriptionId = String(body.subscription_id ?? "");
      const nextStatus = String(body.status ?? "");
      if (!subscriptionId || !["paused","active","cancelled"].includes(nextStatus)) return json({ error: "Invalid subscription action." }, 400);
      const { data: subscription, error: findError } = await admin.from("meal_subscriptions").select("id,status,customer_id").eq("id", subscriptionId).eq("customer_id", user.id).maybeSingle();
      if (findError || !subscription) return json({ error: "Subscription not found." }, 404);
      const allowed = (subscription.status === "active" && ["paused","cancelled"].includes(nextStatus)) || (subscription.status === "paused" && ["active","cancelled"].includes(nextStatus));
      if (!allowed) return json({ error: "This subscription cannot be changed from its current status." }, 409);
      const { error: updateError } = await admin.from("meal_subscriptions").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", subscriptionId).eq("status", subscription.status);
      if (updateError) throw updateError;
      if (nextStatus === "cancelled") {
        await admin.from("meal_subscription_deliveries").update({ status: "cancelled" }).eq("subscription_id", subscriptionId).eq("status", "scheduled");
      }
      return json({ success: true, status: nextStatus });
    }
    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error("meal-subscription-payment", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected subscription error." }, 500);
  }
});
