// Server-side fulfilment of a customer order payment that Paystack has
// confirmed. Used by paystack-webhook so an order is completed even when the
// customer never returns to /order/checkout/callback.
//
// Mirrors the success path of verify-order-payment: check amount, currency
// and reference, consume the stock reservation, claim the transaction once,
// then mark the order(s) paid and create rider offers. Every step is
// idempotent, so the webhook and the callback page can both run safely.
// TODO: move verify-order-payment onto this module so there is one copy.

// deno-lint-ignore no-explicit-any
type Admin = any;

export type OrderPaymentResult =
  | { ok: true; already?: boolean; order_id?: string; order_group_id?: string }
  | { ok: false; error: string; retry?: boolean };

async function createRiderOffersForOrder(admin: Admin, orderId: string) {
  const { data: setting } = await admin.from("platform_settings").select("value")
    .eq("key", "dispatch_rider_offers_enabled").maybeSingle();
  const offersEnabled = setting?.value === true || setting?.value === "true";
  if (!offersEnabled) return;

  const { data: order } = await admin.from("orders")
    .select("id, zone, rider_id, payment_status, status").eq("id", orderId).single();
  if (!order || order.rider_id || order.payment_status !== "paid" || !["placed", "preparing"].includes(order.status)) return;

  const { data: riders } = await admin.from("riders").select("id")
    .eq("status", "online").eq("approval_status", "approved")
    .eq("waiver_completed", true).eq("dispatch_disabled", false).eq("zone", order.zone);
  if (!riders?.length) return;

  const rows = riders.map((r: { id: string }) => ({ order_id: order.id, rider_id: r.id }));
  const { error } = await admin.from("rider_order_offers")
    .upsert(rows, { onConflict: "order_id,rider_id", ignoreDuplicates: true });
  if (error) console.error("DISPATCH_OFFER_CREATE_FAILED", { orderId, message: error.message });
}

async function markSingleOrderPaid(admin: Admin, orderId: string) {
  const { data: order, error: loadError } = await admin.from("orders")
    .select("id, status, cancelled_at, cancelled_by").eq("id", orderId).single();
  if (loadError || !order) throw loadError ?? new Error("Order not found");

  // Unpaid placeholders are created as status=cancelled with no cancellation
  // metadata. Restore only those; never resurrect a genuine cancellation.
  const patch: Record<string, unknown> = {
    payment_status: "paid",
    last_dispatch_attempt_at: new Date().toISOString(),
    dispatch_retry_count: 0,
  };
  if (order.status === "cancelled" && !order.cancelled_at && !order.cancelled_by) patch.status = "placed";
  const { error } = await admin.from("orders").update(patch).eq("id", orderId);
  if (error) throw error;
  await createRiderOffersForOrder(admin, orderId);
}

async function markGroupPaid(admin: Admin, groupId: string) {
  await admin.from("order_groups").update({ payment_status: "paid" }).eq("id", groupId);
  await admin.from("orders").update({ status: "placed", payment_status: "paid" })
    .eq("order_group_id", groupId).eq("status", "cancelled").is("cancelled_at", null).is("cancelled_by", null);
  await admin.from("orders").update({ payment_status: "paid" })
    .eq("order_group_id", groupId).neq("status", "cancelled");
}

async function applyPaid(admin: Admin, txn: { order_id?: string | null; order_group_id?: string | null }) {
  if (txn.order_id) {
    await markSingleOrderPaid(admin, txn.order_id);
    return { ok: true as const, order_id: txn.order_id };
  }
  if (txn.order_group_id) {
    await markGroupPaid(admin, txn.order_group_id);
    return { ok: true as const, order_group_id: txn.order_group_id };
  }
  return { ok: false as const, error: "no_linked_order" };
}

export async function fulfilOrderPayment(
  admin: Admin,
  reference: string,
  paidKobo: number,
  currency: string | undefined,
): Promise<OrderPaymentResult> {
  const { data: txn, error: txnError } = await admin.from("transactions").select("*")
    .eq("reference", reference).eq("type", "order_payment").maybeSingle();
  if (txnError) return { ok: false, error: txnError.message, retry: true };
  if (!txn) return { ok: false, error: "not_found" };

  if (txn.status === "success") {
    // Callback page got there first; make sure side effects completed.
    const res = await applyPaid(admin, txn);
    return res.ok ? { ...res, already: true } : res;
  }

  const expectedKobo = Math.round(Number(txn.amount) * 100);
  if (
    !Number.isSafeInteger(expectedKobo) || expectedKobo <= 0 ||
    !Number.isSafeInteger(paidKobo) || paidKobo !== expectedKobo ||
    (currency && currency !== "NGN")
  ) {
    console.error("ORDER_PAYMENT_WEBHOOK_MISMATCH", { reference, expectedKobo, paidKobo, currency });
    await admin.from("transactions").update({ status: "failed" }).eq("id", txn.id).eq("status", "pending");
    await admin.rpc("release_menu_stock_reservation", { p_reference: reference });
    return { ok: false, error: "amount_mismatch" };
  }

  const { data: stockResult, error: stockError } = await admin.rpc("consume_menu_stock_reservation", { p_reference: reference });
  if (stockError) return { ok: false, error: stockError.message, retry: true };
  if (stockResult?.success !== true) {
    // Money was taken but the stock hold is gone (expired or released).
    // Needs a person: refund or honour the order manually.
    console.error("PAID_BUT_STOCK_UNAVAILABLE_NEEDS_REVIEW", { reference, transactionId: txn.id, stockResult });
    return { ok: false, error: "stock_unavailable" };
  }

  const { data: claimed, error: claimError } = await admin.from("transactions")
    .update({ status: "success" }).eq("id", txn.id).eq("status", "pending").select("id").maybeSingle();
  if (claimError) return { ok: false, error: claimError.message, retry: true };
  if (!claimed) {
    const { data: current } = await admin.from("transactions").select("status").eq("id", txn.id).single();
    if (current?.status !== "success") {
      console.error("PAID_BUT_TRANSACTION_NOT_PENDING_NEEDS_REVIEW", { reference, status: current?.status });
      return { ok: false, error: "transaction_not_pending" };
    }
  }
  return await applyPaid(admin, txn);
}
