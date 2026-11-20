import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_ADDRESS = "BigFoods <onboarding@opticsview.store>";
const SUPPORT_ADDRESS = "support@bigfoods.app";

const copy: Record<string, { subject: string; heading: string; message: string }> = {
  confirmed: { subject: "BigFoods order confirmed", heading: "Payment confirmed", message: "We've received your payment and confirmed your BigFoods order." },
  accepted: { subject: "BigFoods is packing your order", heading: "Order accepted", message: "Your order has been accepted by the branch. The team is packing your already-prepared food." },
  ready: { subject: "Your BigFoods order is ready", heading: "Packed and ready", message: "Your order is packed and ready for pickup or rider handover." },
  picked_up: { subject: "Your BigFoods pickup is complete", heading: "Order picked up", message: "Your pickup order has been handed over. Thank you for ordering from BigFoods." },
  out_for_delivery: { subject: "Your BigFoods order is on the way", heading: "Out for delivery", message: "Your rider has picked up your order and is on the way to your delivery address." },
  delivered: { subject: "Your BigFoods order was delivered", heading: "Delivered", message: "Your BigFoods order has been marked as delivered. Thank you for ordering from us." },
};

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendBigFoodsOrderEmail(db: SupabaseClient, orderId: string, status: string) {
  const template = copy[status];
  if (!template) return { sent: false, reason: "status_not_notifiable" };
  if (!RESEND_API_KEY) {
    console.error("ORDER_EMAIL_SKIPPED: RESEND_API_KEY is not configured");
    return { sent: false, reason: "email_provider_not_configured" };
  }

  const { data: order, error: orderError } = await db.from("bigfoods_pos_online_orders")
    .select("id,order_number,customer_name,customer_email,fulfilment_type,delivery_address,total_amount,work_location_id")
    .eq("id", orderId).maybeSingle();
  if (orderError || !order) {
    console.error("ORDER_EMAIL_ORDER_LOOKUP_FAILED", orderId, orderError?.message);
    return { sent: false, reason: "order_lookup_failed" };
  }
  const email = String(order.customer_email ?? "").trim();
  if (!email) return { sent: false, reason: "customer_email_missing" };

  // The unique (order_id, status) key prevents duplicate emails from payment
  // callback retries, rider retries, or concurrent status requests.
  const { error: claimError } = await db.from("bigfoods_pos_online_order_email_log")
    .insert({ order_id: orderId, status, recipient_email: email, delivery_status: "sending" });
  if (claimError) {
    if (claimError.code === "23505") return { sent: false, reason: "already_claimed" };
    console.error("ORDER_EMAIL_CLAIM_FAILED", orderId, status, claimError.message);
    return { sent: false, reason: "email_log_unavailable" };
  }

  const { data: branch } = await db.from("bigfoods_staff_work_locations")
    .select("name,address").eq("id", order.work_location_id).maybeSingle();
  const { data: items } = await db.from("bigfoods_pos_online_order_items")
    .select("product_name,quantity").eq("order_id", orderId).order("product_name");
  const itemLines = (items ?? []).map((item: { product_name: string; quantity: number }) =>
    `<li style="padding:5px 0">${escapeHtml(item.product_name)} × ${Number(item.quantity)}</li>`).join("");
  const fulfilment = order.fulfilment_type === "delivery" ? "Delivery" : "Pickup";
  const location = order.fulfilment_type === "delivery"
    ? String(order.delivery_address ?? "")
    : String(branch?.name ?? "BigFoods branch");
  const html = `<!doctype html><html><body style="margin:0;background:#f8f5f1;font-family:Arial,sans-serif;color:#211a17;padding:24px">
    <main style="max-width:560px;margin:auto;background:#fff;border-radius:16px;padding:28px">
      <p style="font-size:13px;font-weight:bold;letter-spacing:2px;color:#e96817">BIGFOODS</p>
      <h1 style="font-size:22px">${template.heading}</h1>
      <p>Hello ${escapeHtml(order.customer_name)},</p><p>${template.message}</p>
      <p><b>Order:</b> ${escapeHtml(order.order_number)}<br><b>Fulfilment:</b> ${fulfilment}<br><b>${fulfilment === "Delivery" ? "Delivery address" : "Branch"}:</b> ${escapeHtml(location)}</p>
      <h3>Order items</h3><ul>${itemLines}</ul>
      <p><b>Total paid:</b> ₦${Number(order.total_amount).toLocaleString("en-NG")}</p>
      <p style="font-size:12px;color:#777">Questions? Contact <a href="mailto:${SUPPORT_ADDRESS}">${SUPPORT_ADDRESS}</a>.</p>
    </main></body></html>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_ADDRESS, to: [email], reply_to: SUPPORT_ADDRESS,
        subject: template.subject, html,
        text: `${template.heading}\n\n${template.message}\nOrder: ${order.order_number}\nFulfilment: ${fulfilment}\n${location}\n\nBigFoods`,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Resend returned ${response.status}: ${JSON.stringify(result).slice(0, 300)}`);
    await db.from("bigfoods_pos_online_order_email_log")
      .update({ delivery_status: "sent", provider_message_id: result?.id ?? null, sent_at: new Date().toISOString() })
      .eq("order_id", orderId).eq("status", status);
    return { sent: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("ORDER_EMAIL_SEND_FAILED", orderId, status, reason);
    await db.from("bigfoods_pos_online_order_email_log")
      .update({ delivery_status: "failed", error_message: reason.slice(0, 500) })
      .eq("order_id", orderId).eq("status", status);
    return { sent: false, reason: "provider_send_failed" };
  }
}
