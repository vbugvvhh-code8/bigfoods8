# Payment-link and order-lifecycle audit

Date: 2026-10-22

## 6. Shareable payment link — not implemented yet

The current checkout flow creates an order/order group, creates a pending transaction, initializes Paystack immediately, and returns Paystack's authorization URL. There is no durable shareable-payment-link table, token, expiry timestamp, single-use/consumed marker, or dedicated payment-link route/function in the current schema and application paths inspected.

Before enabling this feature, implement:
- A cryptographically random high-entropy token; store only its hash.
- A 24-hour expiry enforced server-side (not just in the UI).
- A transaction-safe single-use claim/consume operation so two concurrent requests cannot both start or complete payment against the same link.
- Ownership/authorization checks for link creation and access to the linked order.
- Server-side Paystack amount and currency verification before marking the order paid.
- Idempotent verification and safe handling of expired, already-used, failed, and abandoned links.
- A customer-facing share/copy-link flow and an expired/used link screen.
- Tests for expiry boundary, replay, concurrent redemption, altered amount/currency, and Paystack callback replay.

Do not treat a Paystack authorization URL alone as a 24-hour shareable link: the application currently does not persist or enforce the required expiry and duplicate-use rules.

## 7. Existing order history, tracking, and receipt audit

### Order history
- Customer history reads only orders with `payment_status = 'paid'`, which correctly excludes pending checkout attempts.
- History cards show restaurant, status, item count, date, and a total.
- For multi-restaurant orders, delivery fee and tip are stored on `delivery_batches`, not the individual `orders` rows. The prior history-card total used the individual order's zero delivery/tip values, understating the per-leg total.
- Fix in this branch: `useMyOrders` now fetches each linked delivery batch's fee and tip, and `OrderHistoryCard` uses those batch amounts for multi-restaurant totals. The history remains one card per restaurant leg rather than one combined group card.

### Tracking
- The tracking route loads a single order leg, its items, restaurant, rider, and linked delivery batch.
- It uses the batch's delivery code for batched orders and shows sibling restaurant stops if a batch contains more than one restaurant.
- Current checkout creation creates separate delivery batches per restaurant, so each leg should have its own code and trackable order. Tracking must still be exercised in the Netlify preview with both single- and multi-restaurant orders.

### Receipt
- No dedicated customer receipt page/component or receipt-download flow was found in the searched order-history, tracking, and checkout-callback paths.
- The checkout callback confirms payment and provides delivery code(s), but it is not a full receipt. A receipt should show the paid total, line items, per-restaurant subtotal/platform fee, delivery fee and tip allocation, payment reference, payment date, and each delivery code without double-counting shared group totals.

## Verification status

- The order-history total correction is committed on the existing `fix/promotion-dashboard-analytics-history` branch.
- No production deployment was made for the customer-facing history changes; they need a Netlify preview build and browser verification.
- No end-to-end test suite/build was run during this audit.
- The shareable payment-link feature remains unimplemented pending implementation of the durable token/expiry/single-use flow described above.
