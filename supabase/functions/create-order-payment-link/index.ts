import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Sign in to create a payment link." }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authorization } } });
    const { data: auth, error: authError } = await userClient.auth.getUser();
    if (authError || !auth.user) return json({ error: "Not authenticated" }, 401);

    const { reference } = await req.json();
    if (typeof reference !== "string" || !reference.trim()) return json({ error: "A payment reference is required." }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: txn, error: txnError } = await admin.from("transactions")
      .select("id, customer_id, order_id, order_group_id, amount, currency, status, type")
      .eq("reference", reference.trim()).eq("type", "order_payment").maybeSingle();

    if (txnError || !txn || txn.customer_id !== auth.user.id) return json({ error: "Payment attempt not found." }, 404);
    if (txn.status !== "pending") return json({ error: "Only pending payment attempts can have a payment link." }, 409);
    const amountNaira = Number(txn.amount);
    if (!Number.isSafeInteger(amountNaira) || amountNaira <= 0) return json({ error: "Invalid payment amount." }, 400);
    if ((!txn.order_id && !txn.order_group_id) || (txn.order_id && txn.order_group_id)) {
      return json({ error: "This payment attempt is not linked to exactly one order or order group." }, 409);
    }

    // Avoid issuing multiple active links for the same transaction.
    const { data: existing } = await admin.from("order_payment_links")
      .select("id").eq("transaction_id", txn.id).is("consumed_at", null).gt("expires_at", new Date().toISOString()).limit(1);
    if (existing?.length) return json({ error: "An active payment link already exists for this payment attempt. Use the original link or wait for it to expire." }, 409);

    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const row = {
      token_hash: tokenHash,
      customer_id: auth.user.id,
      order_id: txn.order_id,
      order_group_id: txn.order_group_id,
      transaction_id: txn.id,
      amount_naira: amountNaira,
      currency: "NGN",
      expires_at: expiresAt,
    };
    const { error: insertError } = await admin.from("order_payment_links").insert(row);
    if (insertError) {
      console.error("PAYMENT_LINK_CREATE_FAILED", { transactionId: txn.id, message: insertError.message });
      return json({ error: "Unable to create a payment link right now." }, 503);
    }

    const origin = req.headers.get("origin");
    if (!origin || !/^https?:\/\//i.test(origin)) return json({ error: "Unable to determine the application URL. Please try again from the app." }, 400);
    return json({ success: true, payment_url: `${origin.replace(/\/$/, "")}/order/pay/${token}`, expires_at: expiresAt });
  } catch (error) {
    console.error("PAYMENT_LINK_CREATE_ERROR", String(error));
    return json({ error: "Unexpected error creating the payment link." }, 500);
  }
});
