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
    const { token, reference } = await req.json();
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token) || typeof reference !== "string" || !reference) {
      return json({ error: "Invalid payment link or reference." }, 400);
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: link, error: linkError } = await admin.from("order_payment_links")
      .select("id, token_hash, customer_id, order_id, order_group_id, transaction_id, amount_naira, currency, expires_at, consumed_at")
      .eq("token_hash", await sha256(token)).maybeSingle();
    if (linkError || !link || !link.consumed_at) return json({ error: "Payment link not found or not redeemed." }, 404);

    const { data: txn, error: txnError } = await admin.from("transactions")
      .select("id, reference, amount, status, customer_id, order_id, order_group_id, type")
      .eq("id", link.transaction_id).maybeSingle();
    if (txnError || !txn || txn.reference !== reference || txn.customer_id !== link.customer_id ||
        txn.type !== "order_payment" || Number(txn.amount) !== Number(link.amount_naira) ||
        (!!txn.order_id !== !!link.order_id) || (!!txn.order_group_id !== !!link.order_group_id)) {
      return json({ error: "Payment details do not match this link." }, 409);
    }

    if (txn.status === "success") {
      return json({ success: true, order_id: txn.order_id, order_group_id: txn.order_group_id, already_processed: true });
    }
    if (txn.status !== "pending") return json({ error: "This payment attempt is no longer pending." }, 409);

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const payload = await response.json();
    const data = payload?.data;
    const expectedKobo = Number(link.amount_naira) * 100;
    if (!response.ok || data?.status !== "success" || data?.reference !== reference ||
        data?.currency !== "NGN" || !Number.isSafeInteger(expectedKobo) ||
        Number(data?.amount) !== expectedKobo) {
      return json({ success: false, error: "Paystack could not verify the exact amount, currency, and reference." }, 400);
    }

    // Only decrement actual item/variant stock after Paystack confirms the
    // exact successful payment. Initialization holds stock in stock_reserved;
    // consume_menu_stock_reservation performs the real stock reduction here.
    const { data: stockResult, error: stockError } = await admin.rpc(
      "consume_menu_stock_reservation",
      { p_reference: reference },
    );
    if (stockError || stockResult?.success !== true) {
      console.error("ORDER_PAYMENT_LINK_STOCK_CONSUMPTION_FAILED", {
        reference,
        message: stockError?.message ?? null,
        stockResult: stockResult ?? null,
      });
      return json({
        success: false,
        error: "Payment may have been received, but stock could not be confirmed. Please contact BigFoods support before trying to pay again.",
      }, 409);
    }

    const { data: claimed, error: claimError } = await admin.from("transactions")
      .update({ status: "success" }).eq("id", txn.id).eq("status", "pending").select("id").maybeSingle();
    if (claimError) return json({ error: "Unable to finalize payment. Please contact support before retrying." }, 503);
    if (!claimed) {
      const { data: latest } = await admin.from("transactions").select("status").eq("id", txn.id).maybeSingle();
      if (latest?.status === "success") return json({ success: true, order_id: txn.order_id, order_group_id: txn.order_group_id, already_processed: true });
      return json({ error: "This payment attempt has already been processed." }, 409);
    }

    if (txn.order_id) {
      const { data: order } = await admin.from("orders").select("id, status, cancelled_at, cancelled_by").eq("id", txn.order_id).maybeSingle();
      if (!order) return json({ error: "Paid transaction has no matching order. Contact support." }, 500);
      const patch: Record<string, unknown> = { payment_status: "paid", last_dispatch_attempt_at: new Date().toISOString(), dispatch_retry_count: 0 };
      if (order.status === "cancelled" && !order.cancelled_at && !order.cancelled_by) patch.status = "placed";
      const { error } = await admin.from("orders").update(patch).eq("id", order.id);
      if (error) return json({ error: "Payment verified but order update needs support review." }, 503);
      return json({ success: true, order_id: order.id });
    }

    if (txn.order_group_id) {
      const { error: groupError } = await admin.from("order_groups").update({ payment_status: "paid" }).eq("id", txn.order_group_id);
      if (groupError) return json({ error: "Payment verified but order group update needs support review." }, 503);
      const { error: ordersError } = await admin.from("orders").update({ status: "placed", payment_status: "paid" })
        .eq("order_group_id", txn.order_group_id).eq("status", "cancelled").is("cancelled_at", null).is("cancelled_by", null);
      if (ordersError) return json({ error: "Payment verified but order update needs support review." }, 503);
      const { error: paidOrdersError } = await admin.from("orders").update({ payment_status: "paid" })
        .eq("order_group_id", txn.order_group_id).neq("status", "cancelled");
      if (paidOrdersError) return json({ error: "Payment verified but order update needs support review." }, 503);
      return json({ success: true, order_group_id: txn.order_group_id });
    }
    return json({ error: "Transaction is not linked to an order." }, 500);
  } catch (error) {
    console.error("VERIFY_PAYMENT_LINK_ERROR", String(error));
    return json({ error: "Unexpected error verifying this payment." }, 500);
  }
});
