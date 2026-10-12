import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICING_KEY_BY_TYPE: Record<string, string> = {
  verification_fee: "verification_fee",
  rider_verification_fee: "rider_verification_fee",
};
const SEATS_PER_STATE = 1000;

const ACTOR_BY_TYPE: Record<string, "restaurant" | "rider"> = {
  verification_fee: "restaurant",
  promotion: "restaurant",
  onboarding_plan: "restaurant",
  rider_verification_fee: "rider",
};
const CALLBACK_PATH_BY_ACTOR: Record<string, string> = {
  restaurant: "/restaurant-portal/onboarding/payment",
  rider: "/rider-portal/onboarding/payment",
};

// New restaurant onboarding: one payment that includes free ads for the plan
// period. Price always comes from pricing_config, never from the browser.
const ONBOARDING_PRICING_KEY_BY_PLAN: Record<string, string> = {
  "1_month": "onboarding_plan_1_month",   // ₦3,980
  "3_months": "onboarding_plan_3_months", // ₦7,850
};

// One-time signup discount — only available before a restaurant's first-ever
// successful promotion purchase. After that they fall through to recurring rates.
const FIRST_TIME_PROMOTION_PRICING_KEY_BY_PLAN: Record<string, string> = {
  "2_weeks": "promotion_fee_discounted", // ₦2,500
  "1_month": "promotion_fee_normal",     // ₦5,000
};
// Standard rates for every promotion purchase after the first (e.g. from the dashboard).
const RECURRING_PROMOTION_PRICING_KEY_BY_PLAN: Record<string, string> = {
  "1_day": "promotion_dashboard_1_day",     // ₦1,000
  "2_days": "promotion_dashboard_2_days",   // ₦1,500
  "1_week": "promotion_dashboard_1_week",   // ₦5,000
  "2_weeks": "promotion_dashboard_2_weeks", // ₦9,000
  "1_month": "promotion_dashboard_1_month", // ₦15,000
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Not authenticated" }, 401);

    const { type, callbackOrigin, callbackPath, plan } = await req.json();
    const actor = ACTOR_BY_TYPE[type];
    if (!actor) return json({ error: "Unknown payment type" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    let restaurantId: string | null = null;
    let riderId: string | null = null;

    if (actor === "restaurant") {
      const { data: restaurant, error: restaurantError } = await admin
        .from("restaurants")
        .select("id, state, address, latitude, longitude")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (restaurantError || !restaurant) {
        return json({ error: "Complete the earlier onboarding steps first" }, 400);
      }
      restaurantId = restaurant.id;

      if (type === "onboarding_plan") {
        // Everything that must be done BEFORE payment is enforced here, so it
        // can't be skipped by calling this function directly.
        if (!restaurant.address || restaurant.latitude == null || restaurant.longitude == null) {
          return json({ error: "Add your business location before paying" }, 400);
        }
        const { data: details } = await admin
          .from("restaurant_owner_details")
          .select("restaurant_id")
          .eq("restaurant_id", restaurant.id)
          .maybeSingle();
        if (!details) return json({ error: "Complete your personal details before paying" }, 400);

        const { data: bankAccount } = await admin
          .from("restaurant_bank_accounts")
          .select("id")
          .eq("restaurant_id", restaurant.id)
          .maybeSingle();
        if (!bankAccount) return json({ error: "Add your bank details before paying" }, 400);

        // Only 1,000 paid sellers per state. Re-checked here so it cannot be
        // skipped from the browser. (A burst of simultaneous payers could
        // overshoot by a few; paystack-verify is the final gate.)
        const { count: taken } = await admin
          .from("transactions")
          .select("id, restaurants!inner(state)", { count: "exact", head: true })
          .eq("type", "onboarding_plan")
          .eq("status", "success")
          .eq("restaurants.state", restaurant.state);
        if ((taken ?? 0) >= SEATS_PER_STATE) {
          return json({ error: `All ${SEATS_PER_STATE.toLocaleString()} seller places in ${restaurant.state} are taken. You can buy an existing account from a seller who wants to sell.` }, 409);
        }
      }
    } else {
      const { data: rider, error: riderError } = await admin
        .from("riders").select("id").eq("profile_id", user.id).maybeSingle();
      if (riderError || !rider) {
        return json({ error: "Complete the earlier onboarding steps first" }, 400);
      }
      riderId = rider.id;
    }

    let pricingKey: string | undefined;
    let isFirstPromotion = false;

    if (type === "onboarding_plan") {
      pricingKey = ONBOARDING_PRICING_KEY_BY_PLAN[plan];
      if (!pricingKey) {
        return json({ error: `Choose a plan: ${Object.keys(ONBOARDING_PRICING_KEY_BY_PLAN).join(" or ")}.` }, 400);
      }
      const { count: alreadyPaid } = await admin
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("type", "onboarding_plan")
        .eq("status", "success");
      if (alreadyPaid) return json({ error: "This has already been paid" }, 400);
    } else if (type === "promotion") {
      const { count: priorSuccessCount } = await admin
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("type", "promotion")
        .eq("status", "success");
      isFirstPromotion = !priorSuccessCount;

      const planMap = isFirstPromotion
        ? FIRST_TIME_PROMOTION_PRICING_KEY_BY_PLAN
        : RECURRING_PROMOTION_PRICING_KEY_BY_PLAN;
      pricingKey = planMap[plan];
      if (!pricingKey) {
        return json({ error: `Invalid or missing plan. Expected one of: ${Object.keys(planMap).join(", ")}.` }, 400);
      }

      const { count: menuItemCount } = await admin
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId);
      if (!menuItemCount) {
        return json({ error: "Add a menu item before promoting your restaurant" }, 400);
      }
    } else {
      pricingKey = PRICING_KEY_BY_TYPE[type];
      let existingQuery = admin.from("transactions").select("id", { count: "exact", head: true }).eq("type", type).eq("status", "success");
      existingQuery = restaurantId ? existingQuery.eq("restaurant_id", restaurantId) : existingQuery.eq("rider_id", riderId);
      const { count: existingSuccess } = await existingQuery;
      if (existingSuccess) return json({ error: "This has already been paid" }, 400);
    }

    const { data: priceRow, error: priceError } = await admin
      .from("pricing_config")
      .select("value")
      .eq("key", pricingKey)
      .single();
    if (priceError || !priceRow) return json({ error: "Pricing not configured" }, 500);

    const amount = Number(priceRow.value);
    const reference = crypto.randomUUID();
    const savedPlan = type === "promotion" || type === "onboarding_plan" ? plan : null;

    const { error: insertError } = await admin.from("transactions").insert({
      restaurant_id: restaurantId,
      rider_id: riderId,
      type,
      amount,
      reference,
      status: "pending",
      plan: savedPlan,
    });
    if (insertError) throw insertError;

    if (!PAYSTACK_SECRET_KEY) {
      return json({ error: "Payments aren't configured yet — PAYSTACK_SECRET_KEY is missing." }, 502);
    }

    // Callers can override where Paystack redirects back to (e.g. the
    // dashboard's Promotions tab instead of the onboarding flow) by passing
    // callbackPath explicitly. Falls back to the original onboarding path
    // for existing callers that don't pass it, so nothing breaks.
    const resolvedCallbackPath = callbackPath || CALLBACK_PATH_BY_ACTOR[actor];
    const callback_url = callbackOrigin
      ? `${callbackOrigin}${resolvedCallbackPath}?reference=${reference}`
      : undefined;

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(amount * 100),
        reference,
        metadata: {
          type,
          plan: savedPlan,
          is_first_promotion: type === "promotion" ? isFirstPromotion : undefined,
          restaurant_id: restaurantId,
          rider_id: riderId,
        },
        ...(callback_url ? { callback_url } : {}),
      }),
    });
    const paystackData = await paystackRes.json();
    if (!paystackRes.ok || !paystackData.status) {
      return json({ error: paystackData.message ?? "Paystack initialization failed" }, 502);
    }

    return json({ success: true, authorization_url: paystackData.data.authorization_url, reference });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
