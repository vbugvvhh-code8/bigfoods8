# Active service-area enforcement implementation

## Scope

This branch reconciles the exact deployed source for the three affected Edge Functions into version control and adds server-side active-area guards. These changes have **not** been deployed to Supabase.

## Changes in this branch

- `supabase/functions/_shared/service-area.ts`
  - Centralizes canonical zone key generation and active-area validation.
  - Rejects unqualified zone keys when an LGA name exists in multiple states.
  - Checks every restaurant in a multi-restaurant batch; an empty or incomplete batch is ineligible.
- `supabase/functions/_shared/service-area.test.ts`
  - Tests active/inactive areas, unknown values, duplicate LGA names, missing rider zones, and mixed-area batches.
- `supabase/functions/create-order/index.ts`
  - Includes the restaurant's state in the lookup.
  - Uses a server-side service-role read of the full locations list so inactive rows and duplicate LGA names are included in validation.
  - Requires the canonical state/LGA zone key to be active before creating an order; fails closed on lookup errors.
- `supabase/functions/rider-onboarding-save/index.ts`
  - Validates any supplied rider zone against the admin-controlled active location list using the shared canonical-zone helper.
  - Rejects inactive, unknown, missing, or ambiguous/unconfigured values and fails closed if the coverage lookup errors.
- `supabase/functions/dispatch-retry-cron/index.ts`
  - Validates the scheduler header through a service-role-only RPC backed by Supabase Vault, so neither the Edge Function source nor `cron.job.command` needs to contain the secret.
  - Fails closed if the header is missing, the secret does not match, or coverage cannot be read.
  - Loads the complete locations list once per cron invocation and rechecks canonical active coverage before dispatching a single order or batch.
  - Leaves orders/batches in their current state when coverage is inactive; it does not silently cancel or rewrite paid orders.
- `supabase/migrations/20261021143000_secure_dispatch_cron_secret.sql`
  - Generates a 256-bit random scheduler secret inside PostgreSQL, stores it in Vault, and creates a boolean-only verifier RPC.
  - Grants that verifier only to `service_role`; it never returns the secret.
- `.github/workflows/active-service-area-checks.yml`
  - Runs Deno type checks for all three functions and the shared module, plus the service-area unit tests.

## Required release steps (not performed)

1. Review the branch diff and confirm the GitHub Actions Deno type-check and unit-test workflow is green.
2. Apply the Vault-backed cron-secret migration before deploying the cron function.
3. Pause the every-minute dispatch cron job for the short cutover window; deploy the updated function; update the job to read `x-cron-secret` from `vault.decrypted_secrets`; then reactivate the job. Do not expose or copy the Vault value into source code or the scheduler command.
4. Verify the scheduler's next execution succeeds and that a missing/wrong header is rejected. The previous inline secret is treated as compromised and must be removed from the scheduler command.
5. Deploy `create-order` and `rider-onboarding-save` with the shared helper included.
6. Test: active area accepts onboarding and order creation; inactive area rejects both; duplicate LGA names resolve by state; lookup errors fail closed; dispatch retry does not assign riders in inactive areas; already-paid orders remain intact.
7. Verify existing clients send canonical zone values and inspect the current restaurant/rider records for any invalid zone keys before production rollout.

## Important data-model note

The current `riders` table stores a zone key but no separate state/location ID. This implementation validates the zone key against the canonical app convention and active locations; a future schema migration to a `location_id` foreign key would provide stronger referential integrity. Do not infer state from an unqualified LGA name.

## Current active locations observed read-only

- Anambra / Awka South
- Anambra / Nnewi North
- Anambra / Onitsha North
- Anambra / Onitsha South

This list reflects the live database at the time of review and is not hard-coded into the functions.

## Read-only compatibility audit

A read-only audit of the live database found:

- 14 restaurant records: all 14 use canonical state/zone keys; 10 are in active service areas and 4 are in inactive areas.
- 3 restaurants are currently accepting orders outside active coverage: Mama ngozi (Anambra / Anambra East), Bidwish Kitchen (Anambra / Anaocha), and Mma (Ebonyi / Ikwo). This branch rejects new order creation for these areas, but the existing records and accepting flags were not changed.
- 28 rider records: 3 have a missing zone, 11 use an active area, and 14 use inactive areas. The remaining count corresponds to those three missing-zone records; no unknown or ambiguous zone strings were found in the canonical comparison.
- No production restaurant or rider records were changed during this audit.

## Validation run

GitHub Actions run for this branch: https://github.com/vbugvvhh-code8/bigfoods8/actions/workflows/active-service-area-checks.yml

The latest successful run validates the three Edge Functions and shared service-area module, then runs the shared unit tests. These tests cover deterministic zone rules and batch eligibility; they do not replace endpoint-level integration tests against a test Supabase project.
