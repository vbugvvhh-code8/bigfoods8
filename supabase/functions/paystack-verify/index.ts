import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Scope: restaurant onboarding plans, restaurant promotions and rider
// verification fees. Customer order payments are handled by
// verify-order-payment instead.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Ads never start before the public launch, so a restaurant that pays early
// doesn't lose any of the months they paid for.
const PUBLIC_LAUNCH_DATE = new Date("2027-01-05T00:00:00Z");

const DAY_MS = 24 * 60 * 60 * 1000;
const PROMOTION_DURATION_DAYS_BY_PLAN: Record<string, number> = {
  "1_day": 1,
  "2_days": 2,
  "1_week": 7,
  "2_weeks": 14,
  "1_month": 30,
  "3_months": 90,
};
const DEFAULT_PROMOTION_DURATION_DAYS = 30;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);
    const userClient = createClient(SUPABASE_URL(), ANON_KEY(), { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Not authenticated" }, 401);

    const { reference } = await req.json();
    if (!reference) return json({ error: "Missing reference" }, 400);

    const admin = createClient(SUPABASE_URL(), SERVICE_ROLE_KEY());

    const { data: txn, error: txnError } = await admin
      .from("transactions")
      .select("*")
      .eq("reference", reference)
      .single();
    if (txnError || !txn) return json({ error: "Transaction not found" }, 404);

    let owned = false;
    if (txn.restaurant_id) {
      const { data: restaurant } = await admin.from("restaurants").select("owner_id").eq("id", txn.restaurant_id).single();
      owned = restaurant?.owner_id === user.id;
    } else if (txn.rider_id) {
      const { data: rider } = await admin.from("riders").select("profile_id").eq("id", txn.rider_id).single();
      owned = rider?.profile_id === user.id;
    }
    if (!owned) return json({ error: "Transaction not found" }, 404);

    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) return json({ error: "Payments aren't configured yet." }, 502);

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const verifyData = await verifyRes.json();
    const paystackStatus = verifyData?.data?.status;

    if (!verifyRes.ok || paystackStatus !== "success") {
      // Only a pending transaction may be marked failed — never downgrade one
      // that has already succeeded.
      await admin.from("transactions").update({ status: "failed" }).eq("id", txn.id).eq("status", "pending");
      return json({ success: false, error: "Payment was not successful" });
    }

    // Defensive: the amount Paystack collected must match what we recorded.
    const paidKobo = Number(verifyData?.data?.amount);
    if (paidKobo !== Math.round(Number(txn.amount) * 100)) {
      console.error("AMOUNT_MISMATCH", { reference, paidKobo, expected: Number(txn.amount) * 100 });
      return json({ success: false, error: "Payment amount did not match. Contact support." }, 400);
    }

    // Claim the transaction atomically: only the call that flips it to
    // "success" runs the side effects below, so two simultaneous verify calls
    // can't create two promotions or double-apply a fee.
    const { data: claimed } = await admin
      .from("transactions")
      .update({ status: "success" })
      .eq("id", txn.id)
      .neq("status", "success")
      .select("id");
    const firstTimeProcessed = (claimed?.length ?? 0) > 0;

    if (firstTimeProcessed) {
      if (txn.type === "rider_verification_fee" && txn.rider_id) {
        await admin.from("riders").update({ verification_fee_paid: true }).eq("id", txn.rider_id);
      }

      if (txn.type === "onboarding_plan") {
        // Paid onboarding includes free ads for the plan period, starting at
        // launch (or now, if launch has passed).
        const durationDays = PROMOTION_DURATION_DAYS_BY_PLAN[txn.plan] ?? DEFAULT_PROMOTION_DURATION_DAYS;
        let startsAt = new Date();
        if (startsAt < PUBLIC_LAUNCH_DATE) startsAt = new Date(PUBLIC_LAUNCH_DATE);
        const endsAt = new Date(startsAt.getTime() + durationDays * DAY_MS);

        await admin.from("promotions").insert({
          restaurant_id: txn.restaurant_id,
          status: "active",
          plan: txn.plan,
          amount_paid: txn.amount,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
        });
        await admin.from("restaurants").update({ is_featured: true }).eq("id", txn.restaurant_id);
      }

      if (txn.type === "promotion") {
        const { count: menuItemCount } = await admin
          .from("menu_items")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", txn.restaurant_id);

        const durationDays = PROMOTION_DURATION_DAYS_BY_PLAN[txn.plan] ?? DEFAULT_PROMOTION_DURATION_DAYS;
        const shouldActivate = !!menuItemCount;

        let baseStart = new Date();
        if (baseStart < PUBLIC_LAUNCH_DATE) baseStart = new Date(PUBLIC_LAUNCH_DATE);

        if (shouldActivate) {
          const { data: currentPromo } = await admin
            .from("promotions")
            .select("id, ends_at")
            .eq("restaurant_id", txn.restaurant_id)
            .eq("status", "active")
            .order("ends_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (currentPromo?.ends_at && new Date(currentPromo.ends_at) > baseStart) {
            baseStart = new Date(currentPromo.ends_at);
          }
          if (currentPromo?.id) {
            const { error: supersedeError } = await admin
              .from("promotions")
              .update({ status: "superseded" })
              .eq("id", currentPromo.id);
            if (supersedeError) console.error("SUPERSEDE_FAILED", supersedeError);
          }
        }

        const endsAt = new Date(baseStart.getTime() + durationDays * DAY_MS);

        await admin.from("promotions").insert({
          restaurant_id: txn.restaurant_id,
          status: shouldActivate ? "active" : "pending",
          plan: txn.plan,
          amount_paid: txn.amount,
          starts_at: shouldActivate ? baseStart.toISOString() : null,
          ends_at: shouldActivate ? endsAt.toISOString() : null,
        });

        if (shouldActivate) {
          await admin.from("restaurants").update({ is_featured: true }).eq("id", txn.restaurant_id);
        }
      }
    }

    return json({ success: true, type: txn.type });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function SUPABASE_URL() { return Deno.env.get("SUPABASE_URL")!; }
function ANON_KEY() { return Deno.env.get("SUPABASE_ANON_KEY")!; }
function SERVICE_ROLE_KEY() { return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; }
