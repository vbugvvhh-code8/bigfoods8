# Payment-link and order-lifecycle audit

Date: 2026-10-23

## 6. Shareable payment link — schema groundwork only

The normal checkout flow creates an order/order group, creates a pending transaction, initializes Paystack immediately, and returns Paystack's authorization URL. The branch now includes a durable `order_payment_links` table with hashed tokens, a 24-hour expiry timestamp, and a consumed marker. The migration also defines a service-role-only atomic claim function so concurrent redemption attempts cannot both claim the same token.

**The application flow is not implemented yet.** There is no payment-link creation Edge Function, redemption Edge Function, public payment-link page, or complete callback flow for a payer who is different from the customer who created the order. The migration has not been applied to production.

Before enabling this feature, implement and test:
- Authenticated link creation restricted to the order owner and pending transaction.
- A cryptographically random, high-entropy token; only its hash is persisted.
- Server-enforced 24-hour expiry and atomic single-use claim.
- Safe Paystack initialization using the server-stored amount and currency.
- A payment verification path that supports the intended payer model without allowing access to another customer's order or exposing private order data.
- Idempotent handling of Paystack callback retries, expired/used links, initialization failures, and provider errors.
- Customer-facing share/copy-link and expired/used states.
- Tests for expiry boundary, replay and concurrent redemption, amount/currency mismatch, callback replay, and single-/multi-restaurant orders.

Do not treat a Paystack authorization URL alone as a 24-hour shareable link. Do not deploy the migration or Edge Functions until the full flow has been reviewed and tested.

## 7. Existing order history, tracking, and receipt audit

### Order history
- Customer history reads only orders with `payment_status = 'paid'`, excluding pending checkout attempts.
- History cards show restaurant, status, item count, date, and a per-leg total.
- For multi-restaurant orders, delivery fee and tip are stored on `delivery_batches`, not individual `orders` rows. The branch corrects the history-card total by loading the linked batch amounts.
- History remains one card per restaurant leg rather than one combined group card.

### Tracking
- The tracking route loads an order leg, its items, restaurant, rider, and linked delivery batch.
- It uses the batch delivery code for batched orders.
- Single- and multi-restaurant tracking still needs hands-on verification in the Netlify preview.

### Receipt
- Added `/order/receipt/[id]`, which is restricted to the signed-in owner of a paid order.
- It displays order items, subtotal, platform fee, delivery fee, tip, calculated total, payment reference when available, date, restaurant, and delivery code; browser print can be used to print/save it.
- Paid order-history cards now link to the receipt page.
- For multi-restaurant orders, the receipt is a per-leg receipt and uses the delivery batch's fee/tip allocation. It does not present a combined order-group receipt.
- Receipt rendering and database relation/query behavior still need a build and authenticated browser verification.

## Verification status

- Payment verification in the branch checks Paystack status, exact amount in kobo, NGN currency, and matching reference before marking a pending transaction successful.
- Order-history multi-restaurant totals are corrected in the branch.
- Receipt page and history links are committed in the branch.
- Payment-link schema and atomic claim function are committed but not applied to production.
- No build or end-to-end test suite was run during this audit.
- No production migration or Edge Function deployment was performed.
