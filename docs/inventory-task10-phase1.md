# BigFoods Task 10 — Phase 1: Inventory foundation

## Scope delivered
- Adds an ingredient/product inventory catalogue separate from menu availability and checkout reservations.
- Adds receipt batches with supplier, cost, receipt time and expiry.
- Adds an append-only movement ledger and database guard preventing updates/deletes to historical movements.
- Adds versioned recipes and recipe lines for historical expected-usage reconciliation.
- Adds production batches for raw input, output, unprocessed remainder, allowed loss and review state.
- Adds physical-count sessions and per-item expected/count quantities.
- Adds a typed inventory alert queue.
- Enables RLS on every new inventory table. No browser/anon/authenticated policies are created in this phase; access must go through trusted server-side routes/Edge Functions using the existing custom staff-session validator and role/permission checks.

## Permission contract for Phase 2
The API layer must validate the bf_staff_session cookie through the existing bigfoods-staff-session Edge Function on every request and load the current active staff record. Do not trust role/permissions sent by the client.
- Read operational inventory: staff with inventory.view or approved inventory role.
- Receive/count/process/log waste: inventory.receive, inventory.count, inventory.process, inventory.waste respectively.
- Review/approve variance and exceptional adjustments: inventory.reconcile; distinct from routine stock entry.
- Manage items, recipes and tolerances: inventory.manage.
- Owner/admin may receive the full permission set; other roles require explicit grants.
- A movement must always carry actor, type, direction, positive quantity, unit and non-empty reason. An adjustment is represented as a new compensating movement; never mutate the historical ledger.
- Keep service-role credentials server-side only. No direct client-side Supabase writes to these tables.

## Data integrity notes
- Quantities are exact numeric(14,4) values, never floating-point values.
- Batches preserve receipt/expiry provenance.
- Recipes are versioned; historical sales reconciliation must resolve the recipe effective at the sale/production time.
- Production and sales consumption integration must define one consumption point per item to prevent double deduction.
- The movement ledger is immutable. Later API work must keep the corresponding batch remaining quantity transactionally consistent with the movement; do not implement that with separate unprotected client requests.
- Do not seed real stock levels or migrate menu_items.stock_quantity into ingredient inventory automatically.

## Phase 1 verification checklist
- [ ] Apply migration to a disposable/test Supabase database first.
- [ ] Confirm migration succeeds against current Task 11 staff tables and menu_items.
- [ ] Confirm all nine inventory tables have RLS enabled and no direct browser policy.
- [ ] Confirm anon/authenticated cannot read or mutate inventory rows.
- [ ] Confirm trusted service-role/server operations can access the schema.
- [ ] Confirm an update/delete of an inventory movement is rejected and an insert succeeds.
- [ ] Confirm check constraints reject negative/zero movement quantities, invalid units and invalid batch quantities.
- [ ] Run project typecheck/build and inspect Netlify Deploy Preview before moving to staff workflows.

## Dashboard UX direction
Follow the established BigFoods admin/staff visual language: warm off-white backgrounds, dark brown headings, orange primary actions, restrained borders, consistent card radii, clear section hierarchy and responsive mobile layouts. Staff screens should emphasize short task flows and immediate confirmation; admin screens should emphasize review queues, variance context, filters and audit details. Do not add a second inventory navigation system that duplicates the existing shell.
