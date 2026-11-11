# BigFoods POS — implementation plan

**Status:** Architecture approved; foundation documentation only. No cashier workflows or database behavior are implemented by this plan commit.

## 1. Product scope

Build a complete in-house restaurant POS for dine-in table service and counter/takeaway sales, usable on desktop and Android tablets. Online customer orders stay in their existing order system and must not be silently mixed into the POS ledger.

### Core user journeys

**Dine-in**
1. Cashier selects an available table or opens a table session.
2. Add menu items, required options/modifiers, quantities and notes.
3. Send items to the kitchen; subsequent additions create incremental kitchen tickets.
4. Track preparation and serving status.
5. View the bill, apply an authorised discount, and accept payment.
6. Close the table session after the balance is settled; preserve the complete audit trail.

**Counter / takeaway**
1. Start a counter sale without a table.
2. Add items and modifiers to the cart.
3. Confirm the order and send the kitchen ticket where preparation is required.
4. Accept payment and issue a receipt.
5. Complete handover and retain the sale in POS history.

**Management**
- Configure dining areas, tables, catalogue availability and POS settings.
- Monitor open tables, kitchen queue, cashier shifts, sales, payment reconciliation and audit events.
- Restrict refunds, voids, discounts, price overrides and cash adjustments by permission.

## 2. Access model

Reuse `/staff/login`, `bigfoods_staff_sessions`, and the existing custom staff session cookie. Do not use Supabase customer Auth as a substitute for staff identity.

| Role | POS access | Intended scope |
|---|---|---|
| Owner | Full | All POS operations, configuration and reports |
| Admin | Full | All POS operations and reports |
| Manager | Full | Daily operations, approvals, configuration and reports |
| POS | Operational | Create and manage permitted sales, tables and kitchen workflow; no privileged settings or financial overrides without explicit permission |
| Inventory | None by default | Inventory module only |
| Support | None by default | Staff support only |
| Auditor | Read-only, explicit grant | Read POS records and audit reports; no mutations |

### Permission design

- Reuse `pos.view` and `pos.manage` where their semantics fit.
- Add granular permissions through an additive migration only where needed, e.g. `pos.tables.manage`, `pos.kitchen.manage`, `pos.discount.apply`, `pos.sale.void`, `pos.refund`, `pos.reports.view`, `pos.settings.manage`, `pos.shift.reconcile`.
- Define a single server-side authorization helper and test every action against it.
- Correct the staff sidebar logic: the current `canUseStaffOperations` helper is for staff operations and is not a POS authorization check. POS navigation must use POS-specific permissions.
- Never trust a role or permission value sent by the browser.

## 3. Application structure

```text
POS/
  README.md
  IMPLEMENTATION_PLAN.md
  specs/
    workflows.md
    permissions.md
    data-model.md
    acceptance-criteria.md

app/staff/pos/
  page.tsx                 # POS home / terminal
  tables/page.tsx          # floor and table sessions
  kitchen/page.tsx         # kitchen display
  sales/page.tsx           # active and completed sales
  receipts/[id]/page.tsx   # receipt detail / print
  shifts/page.tsx          # cashier shift and reconciliation
  reports/page.tsx         # permitted reports
  settings/page.tsx        # manager/owner configuration

components/pos/
  layout/
  terminal/
  cart/
  catalogue/
  tables/
  kitchen/
  payments/
  receipts/
  shifts/
  reports/

lib/pos/
  access.ts
  types.ts
  validation.ts
  calculations.ts
  format.ts
  services/

app/api/bigfoods-pos/
  [server route adapters]

supabase/functions/bigfoods-pos/
  index.ts

supabase/migrations/
  [additive POS migrations]
```

The `POS/` directory is the feature documentation and specification home. Next.js route entry points must remain under `app/staff/pos`; shared feature UI and domain logic live under `components/pos` and `lib/pos` respectively.

## 4. Domain model to implement and reconcile

Existing tables to inspect and reuse:
- `bigfoods_pos_items`
- `bigfoods_pos_sales`
- `bigfoods_pos_sale_items`
- `inventory_recipes` and its `bigfoods_pos_item_id` relationship

Likely additive POS entities (finalise after inspecting deployed schema and existing inventory/kitchen structures):
- Dining areas and tables.
- Table sessions / checks.
- POS orders and order lines, including order type, modifiers, notes and status.
- Kitchen tickets and ticket lines with incremental-send support.
- Payment/tender records to support split tender and safe reconciliation.
- Cashier shifts, opening float, cash movements and closing counts.
- Discount/void/refund approvals and immutable audit events.
- Inventory-consumption ledger keyed to sale line and recipe version, with uniqueness preventing duplicate deductions.

Do not duplicate existing inventory or staff tables. Do not rename/drop existing POS tables or rewrite historical sales. Migrations must be additive and safe for existing records.

## 5. Delivery phases and gates

### Phase 0 — repository and schema verification
- Inspect current staff session route, cookie behavior and Edge Function deployment conventions.
- Inspect the complete POS migrations, deployed schema assumptions, inventory recipe and stock deduction flows.
- Inspect existing menu options/modifiers, kitchen workflows and receipt/printing utilities before designing duplicates.
- Document confirmed schema, gaps, constraints and test strategy.

**Exit gate:** agreed schema map and no conflicting existing workflow.

### Phase 1 — POS security and navigation foundation
- Add POS-specific authorization helpers and backend permission checks.
- Add permission-aware POS sidebar entry and staff dashboard shortcut.
- Add `/staff/pos` route guard and responsive POS shell for desktop/tablet.
- Add trusted same-origin API adapter and staff-authenticated Edge Function action router.
- Add audit event conventions and server-side input validation.

**Exit gate:** role matrix verified for owner, admin, manager, POS, inventory, support and auditor; unauthorised requests rejected server-side.

### Phase 2 — catalogue and cashier terminal
- Load the separate in-house POS catalogue.
- Search, category filters, availability, product options/modifiers and item notes.
- Cart editing, quantity validation and server-authoritative totals.
- Dine-in, takeaway and counter order types.
- Preserve catalogue prices and sale-line snapshots.

**Exit gate:** complete cart and order draft tests on desktop and Android tablet; browser cannot set final price.

### Phase 3 — tables and kitchen display
- Dining areas, table map/list, table status and open sessions.
- Add items to open table checks; move/merge/split tables and checks with audit records.
- Send/re-send only unsent items to kitchen; prevent duplicate tickets.
- Kitchen queue with accept, preparing, ready and served states.
- Handle cancelled items and post-send amendments with traceability.

**Exit gate:** end-to-end dine-in and takeaway kitchen flow; table and ticket state transitions are concurrency-safe.

### Phase 4 — payments, receipts and sale finalisation
- Initially support only payment methods allowed by the current database constraints: cash and physical Moniepoint terminal.
- Cash received and change due; cashier confirmation for terminal tender.
- Do not represent manual terminal confirmation as automatic provider verification.
- Atomic sale finalisation, unique receipt, idempotency, printable receipt and reprint history.
- Add split payments only after tender schema and reconciliation rules are approved.
- Add audited void/refund flows with permission and approval rules.

**Exit gate:** retries cannot duplicate sales/receipts; unpaid orders cannot be marked paid; all tender totals reconcile.

### Phase 5 — cashier shifts and reconciliation
- Open shift with opening float.
- Record cash-in/out with reason and manager authorisation where required.
- Close shift with counted cash, expected cash, variance and explanation.
- Lock closed shifts and require audited manager action for reopening/adjustment.

**Exit gate:** shift cash calculations reconcile to completed POS tenders and adjustments.

### Phase 6 — inventory integration
- Resolve effective recipe version at sale time.
- Deduct ingredient stock once, only after sale/payment reaches the approved confirmed state.
- Use an idempotent inventory-consumption ledger and atomic transaction boundary.
- Handle unavailable ingredients, recipe gaps, reversals, refunds and waste without silent stock edits.

**Exit gate:** stock ledger matches test sales exactly and retries/refunds cannot double-deduct or silently restore stock.

### Phase 7 — reporting, controls and production hardening
- Sales by date, cashier, item, category and tender.
- Table service duration, kitchen throughput, void/refund and discount reports.
- Permission-scoped exports and audit trail.
- Device/print testing, responsive QA, failure recovery and operational runbook.

**Exit gate:** end-to-end acceptance suite passes and owner/manager signs off on a preview deployment.

## 6. Non-negotiable technical controls

- All money values use decimal/numeric database types; no floating-point arithmetic for financial totals.
- Backend recalculates price, options, discount eligibility, fees and totals from trusted records.
- Use database transactions or a single trusted transactional RPC for multi-row sale finalisation.
- Idempotency keys cover sale creation, payment confirmation, kitchen ticket creation and stock consumption.
- Lock or otherwise serialise concurrent table/check updates and stock deductions.
- Store immutable line snapshots (name, SKU, options, unit price and quantity) so catalogue edits do not rewrite receipts.
- Keep timestamps in UTC and display in the restaurant's configured timezone.
- Never delete completed sales; use reversal records and audit events.
- Validate every action in the Edge Function even if the UI hides the action.
- No service-role key or privileged database credential in browser code.
- Keep POS walk-in transactions separate from online orders, payments and fulfilment.

## 7. Testing strategy

- Unit tests: totals, modifier pricing, discounts, tax/fee calculations, cash change, permissions and state transitions.
- Integration tests: staff session validation, catalogue reads, atomic sale creation, idempotent retries, kitchen ticket lifecycle, shift reconciliation and inventory consumption.
- Security tests: direct API calls by each role, forged prices, stale sessions, duplicate requests and unauthorised refunds/voids.
- Device QA: desktop keyboard/mouse and Android tablet touch layouts, viewport rotation, network interruption and receipt printer compatibility.
- End-to-end scenarios: counter cash sale, Moniepoint sale, dine-in from table open to settlement, split check (when supported), cancelled kitchen item, refund/void approval, cashier shift close and repeated request.

## 8. Immediate next implementation task

Start with **Phase 0**, not a visual-only cashier screen. Produce a verified map of the existing POS schema, staff session contract, inventory recipe/stock workflow, catalogue option format and payment constraints. Then implement Phase 1 in a separate PR or clearly scoped commits after this foundation PR is reviewed.
