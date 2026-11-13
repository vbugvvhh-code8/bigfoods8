# BigFoods POS — Independent Architecture

## Non-negotiable boundary
The in-house POS is a BigFoods-owned operational system. It must not depend on restaurant portal records, restaurant-owned menu items, customer order records, customer checkout, restaurant payment flows, or restaurant dashboard components.

The only shared menu concepts permitted are the category and subcategory labels. POS products live in `bigfoods_pos_items`.

## Experience map
- **POS overview:** sales snapshot, active service sessions, table occupancy, kitchen queue and cashier shift summary.
- **Catalogue:** POS-owned products, SKU, category, subcategory, price and availability.
- **Tables:** dining areas, table layout, seating capacity and live occupancy.
- **Service session:** dine-in, takeaway or counter; guest count; cashier ownership.
- **Kitchen display:** ticket queue with queued → preparing → ready → served lifecycle.
- **Payments:** separate tender records, payment references, confirmation, reversal and reconciliation.
- **Register shifts:** opening float, cash expected, counted cash, variance and supervisor review.
- **Reports:** sales, tender mix, product performance, cashier shifts and audit history.

## Data ownership
| Concern | POS-owned table |
|---|---|
| Products | `bigfoods_pos_items` |
| Dining areas | `bigfoods_pos_dining_areas` |
| Tables | `bigfoods_pos_tables` |
| Service sessions | `bigfoods_pos_table_sessions` |
| Kitchen tickets | `bigfoods_pos_kitchen_tickets` |
| Ticket lines | `bigfoods_pos_kitchen_ticket_items` |
| Sales ledger | `bigfoods_pos_sales`, `bigfoods_pos_sale_items` |
| Tender records | `bigfoods_pos_payments` |
| Cashier register | `bigfoods_pos_register_shifts` |

Ingredient stock remains in the existing BigFoods inventory ledger. POS product recipes may link to inventory recipes through the existing `bigfoods_pos_item_id` relationship. A confirmed sale must eventually consume inventory through one atomic, idempotent server-side transaction.

## Security
- Reuse the custom BigFoods staff session cookie and server-side session hash validation.
- Never use customer Supabase Auth as POS staff authentication.
- All POS data access is service-mediated by the `bigfoods-pos` Edge Function.
- All operational tables have RLS enabled and no browser-facing policies.
- Apply explicit POS permissions per action. Owner/admin are privileged; other roles require explicit `pos.access` plus the specific operation permission.
- Audit catalogue, table, session, ticket, payment, refund and register mutations.
- Do not trust prices, totals, staff IDs or payment confirmation supplied by the browser.

## UI conventions
Use the existing BigFoods staff shell, warm neutral surfaces, dark brown navigation, restrained orange primary actions, compact tables and responsive layouts. POS screens should prioritise speed, clear status and large touch targets. Avoid importing restaurant or customer-order components.

## Implementation sequence
1. Independent schema, staff permissions, route and POS overview.
2. Product catalogue CRUD, cashier terminal, basket and ticket submission.
3. Table service and session lifecycle.
4. Kitchen display and ticket status controls.
5. Sales finalisation, tenders, receipt rendering and refunds.
6. Register shifts and cash reconciliation.
7. Atomic recipe consumption into inventory.
8. Reporting, audit review and end-to-end testing.

## Current implementation notes
The first foundation commit adds the independent dining/table/session/kitchen/payment/register schema, a staff-session secured POS Edge Function, a same-origin API proxy, permission helpers, staff navigation and the first POS workspace UI. Payment settlement, register lifecycle, receipt printing, refunds and inventory deduction are not yet complete and must not be represented as complete.


## Cashier checkout foundation

The cashier can now build a multi-line basket against an open POS service session. The browser submits product IDs and quantities only; the checkout RPC re-reads current POS catalogue prices, validates availability and the session under a row lock, writes the sale and sale lines, records the tender, and uses an idempotency key to protect retries.

- Cash tenders require sufficient cash received, calculate change server-side, mark the sale paid, close the session, and release its table.
- Moniepoint terminal and bank-transfer tenders are deliberately recorded as `needs_review` with a pending payment record. The platform does not claim to verify external payments that are not integrated; these sessions remain awaiting payment and retain their table.
- The payment-review/confirmation workflow, receipt printing, refunds, discounts, tax, and inventory deduction remain outstanding.
- The checkout RPC is service-role only; the Edge Function still authenticates the custom staff session and checks both `pos.sell` and `pos.payments`.


## Staff shift integration

POS reuses the existing BigFoods Staff Operations system. It reads the current `bigfoods_staff_attendance` record and its linked `bigfoods_staff_shift_assignments` / `bigfoods_staff_shift_templates` data. It does not create a second cashier shift or duplicate clock-in/clock-out workflow. Each completed POS sale stores the active attendance ID in `bigfoods_pos_sales.cashier_attendance_id`. The checkout RPC locks and requires an open attendance record before accepting a tender. Staff must use the existing Attendance & Schedule page to check in and out.


## Refunds, reversals and receipts

- Refunds are created against a paid sale with a mandatory reason, refund amount and refund tender. The database locks the sale and prevents cumulative completed refunds from exceeding the original sale total.
- Partial refunds keep the sale in `partially_refunded`; a fully refunded sale is marked `refunded`.
- A completed refund can be reversed only with a new reason. The refund record is retained and marked reversed; it is never deleted.
- Tender reversals are recorded separately from refunds. They retain the payment, reference, amount, staff actor and reason, and move the sale to `voided`. A reversal record does not itself move money through Moniepoint or a bank; staff must complete the provider-side action and record its reference.
- All refund and reversal actions are written to the POS sale audit ledger and the existing staff audit events.
- Receipts are loaded from the saved sale and line-item snapshots, including tender and refund history. They use the shared 72mm thermal receipt print stylesheet.
- **Inventory boundary:** POS checkout does not currently deduct stock, so refunds and reversals do not restore stock. When inventory deduction is implemented later, stock restoration must be limited to quantities actually deducted, idempotent per refund, and compensated exactly once if that refund is reversed.


## POS pricing and physical tenders

- POS tax and discount settings are stored in the singleton `bigfoods_pos_settings` row. Owners and administrators can enable/disable VAT, set the VAT rate, enable/disable discounts, set a maximum discount percentage, and select permitted staff roles.
- Discount authority is checked again by the priced checkout RPC against the authenticated actor role and current settings. Browser-calculated discounts and totals are never trusted.
- The priced checkout RPC calculates the subtotal from current POS catalogue prices, applies an authorised discount, calculates VAT on the discounted subtotal, and saves subtotal, discount, tax, final total and optional customer email to the sale snapshot.
- Cash is settled immediately and change is calculated against the final total. Card uses the physical Moniepoint or other available terminal; bank transfer is checked against the business bank account. Both are pending until authorised staff verify the external payment and record a reference.
- No Paystack or online card gateway is used by this in-house POS flow. External terminal/bank settlement is not automatically verified by the application.
- Receipts show subtotal, discount, VAT, total and optional customer email.
