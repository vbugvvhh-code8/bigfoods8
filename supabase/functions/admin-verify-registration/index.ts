import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Admin confirms (or rejects) a vendor's CAC registration claim.
// Confirmed  -> registration_verified_at is set; the earnings cap no longer applies.
// Rejected   -> the vendor goes back to "unregistered" and the CAC number is cleared.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const FROM_ADDRESS = "BigFoods <onboarding@opticsview.store>";
const SUPPORT_ADDRESS = "support@bigfoods.app";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Not authenticated" }, 401);

    const { data: isAdmin, error: adminError } = await userClient.rpc("is_admin");
    if (adminError || !isAdmin) return json({ error: "Forbidden - admin access required" }, 403);

    const { restaurant_id, decision } = await req.json();
    if (!restaurant_id) return json({ error: "restaurant_id is required" }, 400);
    if (!["verify", "reject"].includes(decision)) return json({ error: "decision must be verify or reject" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: restaurant } = await admin
      .from("restaurants").select("id, name, owner_id, registration_status").eq("id", restaurant_id).maybeSingle();
    if (!restaurant) return json({ error: "Restaurant not found" }, 404);

    const { data: details } = await admin
      .from("restaurant_owner_details").select("cac_number").eq("restaurant_id", restaurant_id).maybeSingle();

    if (decision === "verify") {
      if (restaurant.registration_status !== "registered" || !details?.cac_number) {
        return json({ error: "This vendor has not submitted a CAC number" }, 400);
      }
      const { error } = await admin
        .from("restaurant_owner_details")
        .update({ registration_verified_at: new Date().toISOString(), registration_verified_by: user.id })
        .eq("restaurant_id", restaurant_id);
      if (error) throw error;
    } else {
      const { error: e1 } = await admin.from("restaurants").update({ registration_status: "unregistered" }).eq("id", restaurant_id);
      if (e1) throw e1;
      const { error: e2 } = await admin
        .from("restaurant_owner_details")
        .update({ cac_number: null, registration_verified_at: null, registration_verified_by: null })
        .eq("restaurant_id", restaurant_id);
      if (e2) throw e2;
    }

    await userClient.rpc("log_admin_action", {
      p_action: decision === "verify" ? "registration_verified" : "registration_rejected",
      p_target_table: "restaurants",
      p_target_id: restaurant_id,
      p_details: { cac_number: details?.cac_number ?? null },
    });

    // Tell the vendor. A failed email never undoes the decision.
    if (RESEND_API_KEY && restaurant.owner_id) {
      const { data: owner } = await admin.auth.admin.getUserById(restaurant.owner_id);
      const email = owner?.user?.email;
      if (email) {
        const subject = decision === "verify" ? "Your business registration is confirmed" : "We could not confirm your CAC number";
        const body = decision === "verify"
          ? `Good news: we confirmed the CAC registration for ${restaurant.name}. The earnings limit no longer applies to your account.`
          : `We could not confirm the CAC number you gave for ${restaurant.name}. Your account is marked unregistered, so withdrawals pause once sales reach the limit. Reply to ${SUPPORT_ADDRESS} with the correct number or your certificate and we will check again.`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_ADDRESS, to: [email], reply_to: SUPPORT_ADDRESS, subject,
            html: `<p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${body}</p><p style="font-family:Arial,sans-serif;font-size:12px;color:#6B6459">BigFoods</p>`,
            text: `${body}\n\nBigFoods`,
          }),
        }).catch((e) => console.error("RESEND_SEND_FAILED", e));
      }
    }

    return json({ success: true, restaurant_id, decision });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
