import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { fulfilOrderPayment } from "../_shared/order-payment.ts";

// Paystack calls this URL when a payment succeeds, even if the customer closed
// their browser. It must be public (no JWT), so the signature is what proves the
// request is really from Paystack. Set it in the Paystack dashboard:
//   Settings > API Keys & Webhooks > Live/Test Webhook URL
//   https://<project>.supabase.co/functions/v1/paystack-webhook
//
// Handles two kinds of payment:
// - fees (rider verification, onboarding plan, promotion) via fulfil_transaction()
// - customer order payments via fulfilOrderPayment(), so a paid order is never
//   left cancelled just because the customer didn't return to the site.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function signature(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!PAYSTACK_SECRET_KEY) return new Response("Not configured", { status: 503 });

  const raw = await req.text();
  const given = req.headers.get("x-paystack-signature") ?? "";
  const expected = await signature(raw, PAYSTACK_SECRET_KEY);
  if (!safeEqual(given, expected)) return new Response("Invalid signature", { status: 401 });

  let event: { event?: string; data?: { reference?: string; amount?: number; status?: string; currency?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Only successful charges matter. Everything else is acknowledged and ignored.
  if (event.event !== "charge.success" || event.data?.status !== "success" || !event.data.reference) {
    return new Response("ignored", { status: 200 });
  }
  if (event.data.currency && event.data.currency !== "NGN") {
    return new Response("ignored", { status: 200 });
  }

  const reference = event.data.reference;
  const paidKobo = Number(event.data.amount);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data, error } = await admin.rpc("fulfil_transaction", {
    p_reference: reference,
    p_paid_kobo: paidKobo,
  });

  // A real database failure returns 500 so Paystack retries later.
  if (error) {
    console.error("FULFIL_FAILED", reference, error.message);
    return new Response("error", { status: 500 });
  }
  if (data && data.ok === false && data.error === "amount_mismatch") {
    console.error("AMOUNT_MISMATCH", reference);
  }

  // Customer order payments are not handled by fulfil_transaction().
  if (data && data.ok === false && data.error === "not_handled" && data.type === "order_payment") {
    try {
      const result = await fulfilOrderPayment(admin, reference, paidKobo, event.data.currency);
      if (!result.ok) {
        console.error("ORDER_PAYMENT_WEBHOOK_NOT_FULFILLED", reference, result.error);
        if (result.retry) return new Response("error", { status: 500 });
      }
    } catch (e) {
      console.error("ORDER_PAYMENT_WEBHOOK_FAILED", reference, String(e));
      return new Response("error", { status: 500 });
    }
  }

  return new Response("ok", { status: 200 });
});
