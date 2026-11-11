# BigFoods POS

This directory is the feature home for the BigFoods in-house restaurant Point of Sale (POS) module. It owns the POS product architecture, implementation plan, domain documentation, and acceptance criteria.

## Product decisions

- **Scope:** Full restaurant POS, including dine-in table service and counter/takeaway service.
- **Online orders:** Separate from POS transactions. Online orders remain in their existing order-management workflow; POS does not import them as walk-in sales or write them into the POS sales ledger.
- **Devices:** Responsive desktop and Android tablet support.
- **Identity:** Reuse the existing BigFoods custom staff authentication and session system. No second POS login.
- **Repository:** All changes are developed on feature branches and reviewed through pull requests. Do not merge automatically to `main`.

## Where code belongs

The Next.js App Router requires route entry points under `app/`; therefore, the route adapters cannot physically live only in this directory. Keep the POS domain as a clearly bounded feature:

- `POS/` — POS architecture, domain documentation, specifications, and acceptance criteria.
- `app/staff/pos/` — authenticated POS route entry points and page composition.
- `components/pos/` — POS-only interface components (terminal, cart, tables, kitchen, payment, receipts, reports).
- `lib/pos/` — typed domain models, validation, calculations, and client-side service wrappers. No privileged database access.
- `app/api/bigfoods-pos/` — same-origin server route adapters; validate staff session and forward to the trusted POS Edge Function.
- `supabase/functions/bigfoods-pos/` — trusted server-side authorization, price calculation, transaction orchestration, and audit writes.
- `supabase/migrations/` — additive database migrations for POS-specific schema and constraints.

This keeps the feature cohesive while respecting Next.js and Supabase deployment conventions.

## Existing foundations found in the repository

- `public.bigfoods_staff` and `public.bigfoods_staff_sessions`: custom staff identity and sessions.
- Existing roles include `owner`, `admin`, `manager`, `inventory`, `pos`, `support`, and `auditor`.
- `pos.view` and `pos.manage` permissions already exist in role permission assignment.
- `public.bigfoods_pos_items`: separate in-house POS catalogue, including categories, product metadata, options and availability.
- `public.bigfoods_pos_sales` and `public.bigfoods_pos_sale_items`: existing sale ledger and line items with unique receipt and idempotency fields.
- `public.inventory_recipes.bigfoods_pos_item_id`: existing link from in-house POS items to recipe versions.

These are foundations, not proof that the end-to-end POS application is complete. Inspect and reconcile the live schema and deployed Edge Function behavior before extending or relying on any field.

## Important payment constraint

The latest existing POS migrations constrain new POS sales to `cash` and `moniepoint_pos`. Phase 1 must use those supported methods unless a separately reviewed migration intentionally changes the payment model. A physical Moniepoint terminal payment is recorded as a cashier-confirmed tender; do not claim automatic terminal verification unless a real provider integration is implemented and verified.

## Core boundaries

1. POS walk-in sales and online customer orders remain separate records and workflows.
2. The server is authoritative for item availability, options, prices, discounts, taxes/fees, totals, payment state, receipt numbers and stock effects.
3. A completed sale is immutable. Corrections use audited void/refund/adjustment workflows with role checks.
4. Sale creation is atomic and idempotent. A retry must not create a second sale, receipt, or stock deduction.
5. Inventory consumption must be tied to a confirmed sale and the effective recipe version, and must happen once.
6. Kitchen tickets are operational fulfilment records; they are not payment records.
7. All sensitive actions are attributable to the authenticated staff member.
8. POS permissions are enforced in the trusted backend as well as in navigation and page guards.
