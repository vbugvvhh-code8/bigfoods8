import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_ADDRESS = "BigFoods <onboarding@opticsview.store>";
const SUPPORT_ADDRESS = "support@bigfoods.app";
const MIN_WITHDRAWAL = 10000;
const FEE_RATE = 0.05;
const DEFAULT_UNREGISTERED_CAP = 10_000_000;

function nameTokens(name: string): string[] {
  return name.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
}
// Names appear in different orders / with extra middle names across banks, so
// require most of the shorter name's words to appear in the longer one.
function namesLikelyMatch(a: string, b: string): boolean {
  const ta = nameTokens(a), tb = nameTokens(b);
  if (!ta.length || !tb.length) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.filter((t) => long.includes(t)).length / short.length >= 0.6;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing auth" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Not authenticated" }, 401);
    }

    const { amount } = await req.json();
    if (!amount || amount <= 0) {
      return json({ error: "Enter a valid amount" }, 400);
    }
    if (amount < MIN_WITHDRAWAL) {
      return json({ error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}` }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: restaurant } = await admin
      .from("restaurants")
      .select("id, name, registration_status")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!restaurant) {
      return json({ error: "No restaurant found for this account" }, 400);
    }

    // Bank details are saved as typed. They are checked with the bank here, at
    // withdrawal time, so a typo is caught before any money moves.
    const { data: bankAccount } = await admin
      .from("restaurant_bank_accounts")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();
    if (!bankAccount) {
      return json({ error: "Add your bank details in Settings before withdrawing" }, 400);
    }
    if (!bankAccount.verified) {
      if (!PAYSTACK_SECRET_KEY) return json({ error: "Withdrawals aren't available yet. Try again shortly." }, 502);
      const res = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(bankAccount.account_number)}&bank_code=${encodeURIComponent(bankAccount.bank_code)}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
      );
      const info = await res.json().catch(() => ({}));
      if (!res.ok || !info.status) {
        return json({ error: "Your bank could not find this account. Check the bank and account number in Settings." }, 400);
      }
      if (!namesLikelyMatch(info.data.account_name, bankAccount.account_name)) {
        return json({ error: `Your bank shows this account as "${info.data.account_name}", which does not match the name you entered. Fix it in Settings.` }, 400);
      }
      await admin.from("restaurant_bank_accounts").update({ verified: true, account_name: info.data.account_name }).eq("restaurant_id", restaurant.id);
      bankAccount.verified = true;
      bankAccount.account_name = info.data.account_name;
    }

    const { data: unpaid } = await admin
      .from("restaurant_payouts")
      .select("id")
      .eq("restaurant_id", restaurant.id)
      .in("status", ["pending", "processing"])
      .maybeSingle();
    if (unpaid) {
      return json({ error: "You already have a withdrawal request awaiting payment" }, 400);
    }

    // Authoritative balance — recomputed server-side from source data, never
    // trusting whatever the client displayed.
    const { data: orders } = await admin
      .from("orders")
      .select("subtotal, platform_fee")
      .eq("restaurant_id", restaurant.id)
      .eq("status", "delivered");

    const { data: priorPayouts } = await admin
      .from("restaurant_payouts")
      .select("amount, status")
      .eq("restaurant_id", restaurant.id);

    const netEarnings = (orders ?? []).reduce((sum, o) => sum + Number(o.subtotal) - Number(o.platform_fee ?? 0), 0);
    const deducted = (priorPayouts ?? [])
      .filter((p) => p.status !== "rejected")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const availableBalance = Math.max(0, netEarnings - deducted);

    if (amount > availableBalance) {
      return json({ error: `Amount exceeds your available balance of ₦${availableBalance.toLocaleString()}` }, 400);
    }

    // Unregistered vendors can withdraw only until lifetime food sales reach
    // the cap. A "registered" claim counts only once an admin has verified the
    // CAC number. Sales are food subtotals on delivered orders.
    const { data: details } = await admin
      .from("restaurant_owner_details")
      .select("registration_verified_at")
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();
    const unlimited = restaurant.registration_status === "registered" && !!details?.registration_verified_at;
    if (!unlimited) {
      const { data: capRow } = await admin
        .from("pricing_config")
        .select("value")
        .eq("key", "unregistered_earnings_cap")
        .maybeSingle();
      const cap = Number(capRow?.value ?? DEFAULT_UNREGISTERED_CAP);
      const lifetimeSales = (orders ?? []).reduce((sum, o) => sum + Number(o.subtotal), 0);
      if (lifetimeSales >= cap) {
        return json(
          {
            error: `Your sales have reached the ₦${cap.toLocaleString()} limit for unregistered businesses. Register your business with the CAC and send us your registration number at ${SUPPORT_ADDRESS} to continue withdrawing.`,
            code: "REGISTRATION_REQUIRED",
          },
          403,
        );
      }
    }

    const fee = Math.round(amount * FEE_RATE * 100) / 100;
    const netAmount = amount - fee;

    const { data: created, error: insertError } = await admin
      .from("restaurant_payouts")
      .insert({
        restaurant_id: restaurant.id,
        amount,
        fee,
        net_amount: netAmount,
        status: "pending",
        bank_account_snapshot: {
          account_name: bankAccount.account_name,
          account_number: bankAccount.account_number,
          bank_name: bankAccount.bank_name,
          bank_code: bankAccount.bank_code,
        },
      })
      .select()
      .single();
    if (insertError) throw insertError;

    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [user.email],
          reply_to: SUPPORT_ADDRESS,
          subject: "Withdrawal request received",
          html: buildNoticeEmailHtml(
            "Withdrawal request received",
            `We've received your request to withdraw ₦${amount.toLocaleString()}. After the 5% withdrawal fee (₦${fee.toLocaleString()}), you'll receive ₦${netAmount.toLocaleString()} to your account on file once approved.`
          ),
          text: `Withdrawal request received\n\nWe've received your request to withdraw ₦${amount.toLocaleString()}. After the 5% withdrawal fee (₦${fee.toLocaleString()}), you'll receive ₦${netAmount.toLocaleString()} once approved.\n\nBigFoods`,
        }),
      }).catch((e) => console.error("RESEND_SEND_FAILED", e));
    }

    return json({ success: true, payout: created });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function buildNoticeEmailHtml(title: string, body: string): string {
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
<tr><td style="padding:16px 32px 28px 32px; text-align:center;">
<p style="margin:0; font-size:11px; color:#6B6459;">Questions? Reach us at <a href="mailto:support@bigfoods.app" style="color:#201C1A;">support@bigfoods.app</a>.</p>
</td></tr>
<tr><td style="padding:14px 32px; border-top:1px solid #F0E1D2; text-align:center;"><p style="margin:0; font-size:11px; color:#8C8681;">BigFoods &middot; Anambra, Nigeria</p></td></tr>
</table></td></tr></table></body></html>`;
}
