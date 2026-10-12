import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

    const { account_number, bank_code, account_name } = await req.json();
    if (!account_number || !bank_code) {
      return json({ error: "Account number and bank are required" }, 400);
    }
    const accountName = String(account_name ?? "").replace(/\s+/g, " ").trim();
    if (accountName.length < 3 || accountName.length > 80) {
      return json({ error: "Enter the account name exactly as your bank shows it" }, 400);
    }
    if (!/^\d{10}$/.test(String(account_number))) {
      return json({ error: "Account number must be 10 digits" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Only banks listed (and active) in accepted_banks can be used. The bank
    // name always comes from this table, never from the browser.
    const { data: bank } = await admin
      .from("accepted_banks")
      .select("code, name")
      .eq("code", bank_code)
      .eq("is_active", true)
      .maybeSingle();
    if (!bank) return json({ error: "That bank isn't supported for withdrawals yet" }, 400);
    const bank_name = bank.name;

    const { data: restaurant } = await admin.from("restaurants").select("id").eq("owner_id", user.id).maybeSingle();
    if (!restaurant) return json({ error: "No restaurant found for this account" }, 400);

    const { data: saved, error: upsertError } = await admin
      .from("restaurant_bank_accounts")
      .upsert(
        {
          restaurant_id: restaurant.id,
          account_name: accountName,
          account_number,
          bank_name,
          bank_code,
          verified: false, // checked with the bank at the first withdrawal
          updated_at: new Date().toISOString(),
        },
        { onConflict: "restaurant_id" }
      )
      .select()
      .single();
    if (upsertError) throw upsertError;

    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [user.email],
          reply_to: SUPPORT_ADDRESS,
          subject: "Your withdrawal account was updated",
          html: buildNoticeEmailHtml(
            "Withdrawal account updated",
            `Your withdrawal account has just been updated to ${bank_name}, account ending in ${String(account_number).slice(-4)} (${accountName}). If this wasn't you, contact us immediately.`
          ),
          text: `Your withdrawal account has just been updated to ${bank_name}, account ending in ${String(account_number).slice(-4)} (${accountName}).\n\nIf this wasn't you, contact us immediately at ${SUPPORT_ADDRESS}.\n\nBigFoods`,
        }),
      }).catch((e) => console.error("RESEND_SEND_FAILED", e));
    }

    return json({ success: true, bankAccount: saved });
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
