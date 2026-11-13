# BigFoods POS finalization — inventory and end-to-end verification

## Objective

Complete the remaining operational gap after PR #35: connect completed POS sales to the ingredient inventory ledger without weakening the existing staff-session security, checkout idempotency, payment controls, or audit trail.

PR #35 is the foundation. This phase must be additive and must preserve its existing checkout, receipts, refunds, payment reversals, staff authentication, attendance gating, and POS permissions.

## Delivery scope

1. **Recipe-based sale consumption**
   - Resolve the active recipe version effective at the sale time for each sold menu item.
   - Calculate ingredient usage from sold quantity and recipe output quantity using exact numeric arithmetic.
   - Consume eligible inventory batches in a deterministic FEFO order (earliest expiry first, then receipt time).
   - Write matching `sale_usage` movements and update batch balances in one database transaction.
   - Reject or explicitly flag a sale that cannot be fulfilled from tracked stock; never silently allow negative inventory.
   - Enforce one consumption point so kitchen/production workflows cannot deduct the same ingredients again.

2. **Refund and reversal behavior**
   - Partial and full refunds must not automatically restore ingredients that have already been prepared/served.
   - Define an explicit, permission-controlled restock decision for eligible unused items.
   - Any approved restoration must create compensating `return` movements and new/appropriate stock batches atomically; never edit or delete the immutable movement history.
   - Refund reversal must reverse the financial refund record without accidentally duplicating inventory restoration.

3. **Security and audit**
   - Continue validating the existing `bf_staff_session` through the staff-session Edge Function on every request.
   - Keep service-role access server-side; do not add browser table policies.
   - Enforce staff permissions in trusted server code and database RPCs.
   - Record actor, sale/refund references, quantities, recipe version, batch allocations, and reasons in audit metadata.
   - Make retries safe and idempotent.

4. **Operational visibility**
   - Surface stock shortages and inventory consumption outcomes clearly to cashiers/managers.
   - Preserve historical sale/receipt details even when recipes change later.
   - Provide a reconciliation path for legacy sales and exceptions without inventing opening stock or silently migrating menu stock quantities.

## Database and implementation constraints

- Use the existing `inventory_items`, `inventory_batches`, `inventory_movements`, `inventory_recipes`, and `inventory_recipe_items` schema.
- Use exact `numeric(14,4)` quantities and explicit unit compatibility; do not use floating-point arithmetic for stock.
- Consumption, batch balance updates, movement inserts, and sale linkage must be transactional.
- Inventory movements are append-only. Corrections require compensating movements.
- Do not assume that a payment status means the external bank or Moniepoint provider independently settled the payment.
- Do not change the existing custom BigFoods staff login to Supabase Auth.

## End-to-end acceptance checklist

- [ ] Cash sale with a valid recipe deducts the expected ingredient quantities exactly once.
- [ ] Moniepoint-terminal sale follows the same inventory-consumption policy.
- [ ] Pending bank transfer does not consume stock until the configured paid/confirmed point.
- [ ] Repeated checkout requests with the same idempotency key do not duplicate sales or movements.
- [ ] Multiple batches are consumed in FEFO order and batch balances reconcile to the ledger.
- [ ] Insufficient stock is handled safely with a clear cashier response and no partial ledger writes.
- [ ] Missing recipe, inactive recipe, changed recipe version, and incompatible units are handled explicitly.
- [ ] Partial/full refunds do not restore prepared/served ingredients by default.
- [ ] An authorized restock creates compensating return movements once only.
- [ ] Refund reversal does not duplicate stock restoration.
- [ ] Staff permission denial, inactive staff, and invalid/expired staff sessions are tested.
- [ ] Receipt, sale history, audit records, and inventory movement history reconcile.
- [ ] Netlify deploy preview builds successfully and browser end-to-end tests pass.

## Deployment and rollout

- Apply new migrations to a disposable/test Supabase database first.
- Verify transaction rollback, idempotency, RLS, and service-role-only RPC execution before deployment.
- Do not seed real stock or run historical deductions automatically.
- Deploy the Edge Function and migrations only after test verification and explicit rollout review.
- Keep this PR unmerged until the complete end-to-end checklist is verified.
