# BigFoods POS implementation audit

**Audit date:** 2026-11-11  
**Scope:** Staff POS checkout, catalogue, sales ledger, order history, analytics, reports, staff navigation and the inventory Edge Function.  
**Method:** Static review of the current `main` source. No production database mutations, payment-terminal transactions, or live end-to-end tests were performed.

## Executive summary

The POS is a working first-pass in-house sales flow: staff authentication and role checks, catalogue browsing, cart quantity controls, promotional pricing, cash checkout, manual physical-terminal confirmation, receipt display/printing, sales history, CSV export, and basic sales summaries are present.

It is **not yet a complete operational POS**. There is at least one release-blocking schema/API mismatch, a non-atomic sale write path, and several visible modules that are placeholders or incomplete. The highest priority is to make payment recording and sale persistence reliable before expanding features.

## Findings

### P0 — Release blockers / financial integrity

1. **Moniepoint checkout conflicts with the database constraint.**
   - `supabase/migrations/20261025170000_bigfoods_pos_sales.sql` permits `cash`, `transfer`, and `card` in `bigfoods_pos_sales.payment_method`.
   - `supabase/functions/bigfoods-inventory/index.ts` accepts and inserts `moniepoint_pos`.
   - The POS UI sends `moniepoint_pos`.
   - Unless the live database has an untracked follow-up migration changing that constraint, terminal sales will fail at insert time. Reconcile the canonical payment-method enum/check constraint and add a migration test.

2. **Sale header and sale lines are written in separate, non-transactional requests.**
   - `pos_sale_create` first inserts a sale with status `paid`, then inserts its item rows.
   - If the item insert fails, it updates the sale to `needs_review` and returns an error. This can leave a paid/partially recorded sale header without lines and requires manual recovery.
   - Move header + line creation into one database RPC/transaction. The sale must not become paid unless all lines are persisted successfully.

3. **Payment is asserted, not verified, for Moniepoint.**
   - The cashier checkbox `terminal_confirmed` is the only evidence for a terminal payment; the Edge Function stores a free-text note and marks the sale paid.
   - There is no terminal transaction reference, provider reconciliation, or verified settlement callback in this POS flow.
   - Until an integration exists, label this accurately as a manually recorded external payment and require a transaction/reference number plus supervisor reconciliation. Do not represent it as provider-verified.

### P1 — Core POS workflows missing or incomplete

4. **Discounts are UI-only.**
   - The checkout exposes an “Add Discount” code field, but Apply only displays a notice that discount codes are not configured; the subtotal, discount, and total remain unchanged.
   - Implement validated discount rules (fixed/percentage, eligibility, limits, expiry, authorization, audit trail) in the server-side pricing transaction, or remove/disable the control until supported.

5. **Customer management is not implemented.**
   - The POS navigation explicitly shows a notice that customer management is not connected.
   - Checkout stores only an optional email; there is no customer lookup/create, customer profile, phone/name capture, customer purchase history, or loyalty linkage in this POS flow.
   - Decide the minimum customer record model and connect checkout and order history to it.

6. **Receipt delivery is not implemented.**
   - The checkout explicitly says receipt email delivery is not connected. A receipt is shown on screen and can be printed.
   - Add a durable receipt view and optional email/SMS delivery with retry/status tracking; do not block sale completion on notification delivery.

7. **No void/refund workflow despite statuses existing in the ledger.**
   - The schema and order filters include `voided` and `refunded`, but the Edge Function has no corresponding mutation action in the reviewed implementation.
   - Add permission-gated, reason-required, audited void/refund operations with immutable actor/time records and a clear distinction between reversing a sale and refunding money externally. Otherwise hide unsupported statuses from the UI.

8. **Inventory stock is not integrated into POS sale completion.**
   - Catalogue records have `stock_quantity`, and inventory recipes/production workflows exist, but `pos_sale_create` does not validate or decrement catalogue stock and does not consume recipe ingredients/batches.
   - Define the authoritative stock source (catalogue quantity vs inventory ledger/recipe) and perform deduction atomically with sale persistence. Prevent overselling under concurrent checkouts.

9. **Product options/modifiers are not carried into the sale.**
   - The POS catalogue schema has `option_groups`, but the cashier cart and sale line payload contain only product ID and quantity. No size, add-on, modifier, or option price is selected or snapshotted.
   - Implement option selection and persist a full price/name snapshot on each sale line, or explicitly scope modifiers out and remove the misleading catalogue capability.

10. **Availability schedule is not enforced at checkout.**
    - Catalogue items can store weekly availability schedules, but the POS catalogue overview filters only `is_available`; the sale action checks only `is_available`.
    - Enforce schedule windows server-side (including timezone and overnight windows), or clarify that schedule controls are not active for POS.

### P2 — Reporting, navigation and usability

11. **Orders page presents non-functional controls and misleading metrics.**
    - Row checkboxes do not maintain a selection state; the action menus and customer-edit affordance do not perform an action.
    - “Sales on Page” is page-scoped, while the card labels can be read as overall totals. The “vs last period” comparison is static presentation, not a computed comparison.
    - Implement the actions and accurately label/compute metrics.

12. **Orders filtering is narrower than its UI suggests.**
    - The search UI suggests customer/payment filtering, while the server query searches only receipt number and customer email.
    - The “All POS Sales” and “POS Sales” tabs currently represent the same POS-only dataset; online orders are explicitly not connected.
    - Either implement the advertised filters and unified order source, or rename controls to match current behavior.

13. **Analytics and reports are POS-ledger-only.**
    - Both pages explicitly exclude online orders and customer analytics. Reporting also lacks cashier/shift breakdown, product/category performance, discounts, refunds/voids, tax, and inventory cost/margin.
    - Add these only after ledger semantics and stock integration are reliable. Use server-side pagination/aggregation for larger datasets.

14. **Date filters need timezone and validation review.**
    - Sales list/summary filters construct UTC day boundaries from date-only values. Confirm the business timezone and use a consistent local-day-to-UTC conversion. Add invalid-range handling and tests around daylight-saving/timezone boundaries where applicable.

15. **Catalogue and POS capabilities are inconsistent.**
    - The catalogue migration supports multiple images and rich metadata, while the catalogue editor’s validation requires exactly one image in the reviewed source.
    - Align the form, API validation, and schema on the supported image count and metadata fields.

16. **Navigation has an unfinished Customers destination.**
    - POS, orders, analytics, reports, menu and settings have routes, but Customers is a placeholder. Verify the remaining route links and active-state consistency across all POS pages.

## Recommended implementation order

1. Fix the payment-method constraint mismatch and add migration/Edge Function contract tests.
2. Make sale header + lines + stock consumption atomic and idempotent.
3. Define payment evidence/reconciliation for Moniepoint and add a transaction reference.
4. Implement stock deduction and out-of-stock/oversell protection using the authoritative inventory model.
5. Implement void/refund with permissions, reasons and audit events.
6. Finish receipt details and delivery.
7. Decide and implement modifiers/options, schedules, discounts and customer records.
8. Complete order actions/search/filtering and align analytics/reports with the real ledger.

## Verification checklist before calling POS production-ready

- [ ] Cash sale: exact total, underpayment rejection, change calculation, receipt and ledger rows.
- [ ] Moniepoint sale: valid method constraint, reference capture, duplicate/retry handling and reconciliation.
- [ ] Concurrent checkout: no overselling or duplicate stock deduction.
- [ ] Failure injection: sale header/line/stock writes roll back together.
- [ ] Promotions: start/end boundaries and server/client price agreement.
- [ ] Discounts: valid, invalid, expired, capped and unauthorized cases.
- [ ] Void/refund: permissions, reason, audit trail and correct reporting.
- [ ] Receipt: print layout, durable retrieval and notification retry.
- [ ] Role matrix: cashier, POS manager, inventory staff and admin.
- [ ] Orders: search, status/date filters, pagination, export and all visible actions.
- [ ] Analytics/reports: totals reconcile to the underlying ledger and clearly state included sources.
- [ ] Mobile/tablet cashier usability and keyboard/scanner workflow.

## Important scope note

This is a source-level audit, not a claim that every listed gap has been reproduced in a deployed environment. In particular, confirm the actual applied database constraints/migrations and test the payment flows in a safe staging environment before changing production data.
