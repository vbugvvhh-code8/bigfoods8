# Active service-area enforcement implementation

## Scope

This branch reconciles the exact deployed source for the three affected Edge Functions into version control and adds server-side active-area guards. These changes have **not** been deployed to Supabase.

## Changes in this branch

- `supabase/functions/create-order/index.ts`
  - Includes the restaurant's state in the lookup.
  - Checks its canonical zone against `public.locations` and requires the matching state/LGA row to be active before creating an order.
  - Returns a client-safe error for inactive or unconfigured coverage and fails closed if the coverage lookup errors.
- `supabase/functions/rider-onboarding-save/index.ts`
  - Validates any supplied rider zone against the admin-controlled active location list.
  - Uses the same duplicate-LGA zone key convention as `lib/nigeriaLocations.ts` (for example, `Surulere (Lagos)`).
  - Rejects inactive, unknown, or ambiguous/unconfigured values and fails closed if the coverage lookup errors.
- `supabase/functions/dispatch-retry-cron/index.ts`
  - Replaces the source-embedded cron secret with `Deno.env.get("CRON_SECRET")`.
  - Fails closed if the secret is missing or the request header does not match.
  - Rechecks active coverage before rider assignment for both single orders and multi-restaurant batches.
  - Leaves orders/batches in their current state when coverage is inactive; it does not silently cancel or rewrite paid orders.

## Required release steps (not performed)

1. Review the branch diff and run TypeScript/Deno checks in CI or a local Supabase Functions environment.
2. Configure a new `CRON_SECRET` Supabase Edge Function secret and update the scheduler to send that new value in `x-cron-secret`. The previous embedded value must be considered compromised and rotated. Do not deploy the cron function until the secret and scheduler are coordinated.
3. Deploy the three functions to a non-production/test environment first, if available.
4. Test: active area accepts onboarding and order creation; inactive area rejects both; duplicate LGA names resolve by state; lookup errors fail closed; dispatch retry does not assign riders in inactive areas; already-paid orders remain intact.
5. Verify existing clients send canonical zone values and inspect the current restaurant/rider records for any invalid zone keys before production rollout.
6. Only after verification, request explicit production deployment approval.

## Important data-model note

The current `riders` table stores a zone key but no separate state/location ID. This implementation validates the zone key against the canonical app convention and active locations; a future schema migration to a `location_id` foreign key would provide stronger referential integrity. Do not infer state from an unqualified LGA name.

## Current active locations observed read-only

- Anambra / Awka South
- Anambra / Nnewi North
- Anambra / Onitsha North
- Anambra / Onitsha South

This list reflects the live database at the time of review and is not hard-coded into the functions.
