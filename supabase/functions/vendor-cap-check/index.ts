import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Runs on a schedule (pg_cron -> pg_net). Emails unregistered vendors as their
// lifetime food sales approach the cap, once per milestone. Safe to call any
// number of times: each milestone is recorded in vendor_cap_notices.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const FROM_ADDRESS = "BigFoods <onboarding@opticsview.store>";
const SUPPORT_ADDRESS = "support@bigfoods.app";
const DEFAULT_CAP = 10_000_000;
const THRESHOLDS = [100, 95, 80, 50]; // percent of the cap, highest first

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

function messageFor(threshold: number, sales: number, cap: number) {
  if (threshold === 100) {
    return {
      subject: "Action needed: register your business to keep withdrawing",
      body: `Your sales on BigFoods have reached ${naira(cap)}, the limit for unregistered businesses. You can keep taking orders, but withdrawals are paused until you register your business with the CAC. Once registered, email your CAC number to ${SUPPORT_ADDRESS} (or add it in your dashboard) and the limit is removed.`,
    };
  }
  return {
    subject: `You've reached ${threshold}% of the unregistered-business limit`,
    body: `Your sales on BigFoods are now ${naira(sales)}, which is ${threshold}% of the ${naira(cap)} limit for unregistered businesses. At ${naira(cap)} withdrawals pause until your business is registered with the CAC. Registering early removes the limit, so you will never be interrupted. Questions? Write to ${SUPPORT_ADDRESS}.`,
  };
}

function emailHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0; padding:0; background-color:#FF6A00; font-family:Arial, Helvetica, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FF6A00; padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px; background-color:#FFFDFB; border-radius:16px; overflow:hidden;">
<tr><td style="padding:28px 32px 8px 32px; text-align:center;"><span style="font-size:17px; font-weight:bold; color:#201C1A;">BigFoods</span></td></tr>
<tr><td style="padding:16px 32px;">
<p style="margin:0 0 10px; font-size:15px; font-weight:bold; color:#201C1A;">${title}</p>
<p style="margin:0; font-size:13.5px; line-height:1.6; color:#201C1A;">${body}</p>
</td></tr>
<tr><td style="padding:14px 32px; border-top:1px solid #F0E1D2; text-align:center;"><p style="margin:0; font-size:11px; color:#8C8681;">BigFoods &middot; Anambra, Nigeria</p></td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async () => {
  try {
    if (!RESEND_API_KEY) return Response.json({ skipped: "RESEND_API_KEY missing" });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: capRow } = await admin.from("pricing_config").select("value").eq("key", "unregistered_earnings_cap").maybeSingle();
    const cap = Number(capRow?.value ?? DEFAULT_CAP);

    // Lifetime food sales per restaurant (delivered orders), paged.
    const sales = new Map<string, number>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin
        .from("orders")
        .select("restaurant_id, subtotal")
        .eq("status", "delivered")
        .range(from, from + 999);
      if (error) throw error;
      for (const o of data ?? []) sales.set(o.restaurant_id, (sales.get(o.restaurant_id) ?? 0) + Number(o.subtotal));
      if (!data || data.length < 1000) break;
    }

    const lowest = (cap * Math.min(...THRESHOLDS)) / 100;
    const candidates = [...sales.entries()].filter(([, total]) => total >= lowest);
    let sent = 0;

    for (const [restaurantId, total] of candidates) {
      const { data: restaurant } = await admin
        .from("restaurants").select("id, owner_id, registration_status").eq("id", restaurantId).maybeSingle();
      if (!restaurant?.owner_id) continue;
      const { data: details } = await admin
        .from("restaurant_owner_details").select("registration_verified_at").eq("restaurant_id", restaurantId).maybeSingle();
      if (restaurant.registration_status === "registered" && details?.registration_verified_at) continue;

      const crossed = THRESHOLDS.filter((t) => total >= (cap * t) / 100);
      const { data: already } = await admin.from("vendor_cap_notices").select("threshold").eq("restaurant_id", restaurantId);
      const done = new Set((already ?? []).map((r) => r.threshold));
      const fresh = crossed.filter((t) => !done.has(t));
      if (fresh.length === 0) continue;

      const top = fresh[0]; // highest newly crossed milestone gets the email
      const { data: owner } = await admin.auth.admin.getUserById(restaurant.owner_id);
      const email = owner?.user?.email;
      if (!email) continue;

      const { subject, body } = messageFor(top, total, cap);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_ADDRESS, to: [email], reply_to: SUPPORT_ADDRESS, subject, html: emailHtml(subject, body), text: `${subject}\n\n${body}\n\nBigFoods` }),
      });
      if (!res.ok) { console.error("RESEND_FAILED", restaurantId, res.status); continue; }

      // Record every newly crossed milestone so lower ones are never sent late.
      await admin.from("vendor_cap_notices").insert(fresh.map((t) => ({ restaurant_id: restaurantId, threshold: t })));
      sent++;
    }

    return Response.json({ checked: candidates.length, sent });
  } catch (e) {
    console.error("VENDOR_CAP_CHECK_FAILED", e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
});
