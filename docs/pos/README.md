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
