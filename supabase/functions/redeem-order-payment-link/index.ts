import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!PAYSTACK_SECRET_KEY) return json({ error: "Payments aren't configured yet." }, 502);

  try {
    const { token, callbackOrigin } = await req.json();
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) return json({ error: "This payment link is invalid or expired." }, 404);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const tokenHash = await sha256(token);

    // Atomic database claim enforces expiry and prevents parallel redemptions.
    const { data: claimedRows, error: claimError } = await admin.rpc("claim_order_payment_link", { p_token_hash: tokenHash });
    if (claimError) {
      console.error("PAYMENT_LINK_CLAIM_FAILED", claimError.message);
      return json({ error: "Payment links are not available until the database migration is applied." }, 503);
    }
    const link = Array.isArray(claimedRows) ? claimedRows[0] : null;
    if (!link) return json({ error: "This payment link has expired or has already been used." }, 410);

    const { data: txn, error: txnError } = await admin.from("transactions")
      .select("id, reference, amount, status, customer_id, order_id, order_group_id, type")
      .eq("id", link.transaction_id).maybeSingle();
    if (txnError || !txn || txn.status !== "pending" || txn.type !== "order_payment" ||
        txn.customer_id !== link.customer_id ||
        Number(txn.amount) !== Number(link.amount_naira) ||
        (!!txn.order_id !== !!link.order_id) || (!!txn.order_group_id !== !!link.order_group_id)) {
      return json({ error: "This payment link is no longer valid for the payment attempt." }, 409);
    }

    const { data: customer } = await admin.auth.admin.getUserById(link.customer_id);
    const email = customer.user?.email;
    if (!email) return json({ error: "The order owner has no payment email configured. Please contact support." }, 409);

    const appOrigin = typeof callbackOrigin === "string" && /^https?:\/\//i.test(callbackOrigin)
      ? callbackOrigin.replace(/\/$/, "")
      : null;
    if (!appOrigin) return json({ error: "The application callback URL is required." }, 400);

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: Number(link.amount_naira) * 100,
        currency: "NGN",
        reference: txn.reference,
        callback_url: `${appOrigin}/order/pay/complete?token=${encodeURIComponent(token)}`,
        metadata: { type: "order_payment_link", payment_link_id: link.id, transaction_id: txn.id },
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.status || typeof payload?.data?.authorization_url !== "string") {
      console.error("PAYMENT_LINK_PAYSTACK_INIT_FAILED", { linkId: link.id, message: payload?.message });
      return json({ error: "Unable to start payment. This link has been claimed; contact support before retrying." }, 502);
    }

    return json({ success: true, authorization_url: payload.data.authorization_url, reference: txn.reference, expires_at: link.expires_at });
  } catch (error) {
    console.error("PAYMENT_LINK_REDEEM_ERROR", String(error));
    return json({ error: "Unexpected error opening this payment link." }, 500);
  }
});
