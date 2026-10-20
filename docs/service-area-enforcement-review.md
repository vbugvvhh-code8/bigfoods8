# Edge Function source-of-truth and service-area review

## Why this review exists

The deployed Supabase project contains Edge Functions that were not found at the corresponding paths on the repository's `main` branch during the service-area review. Do not deploy a replacement from this branch until the live implementation and repository version have been reconciled.

## Confirmed review findings

- `rider-onboarding-save` accepts a rider's `zone` in its allowed patch fields and writes it using a service-role client. It does not validate that the selected zone is an active service area.
- `create-order` checks that a restaurant exists and accepts orders, but its live implementation does not verify the restaurant's state/LGA against `public.locations.is_active` before creating an order.
- `dispatch-retry-cron` selects riders by zone and approval/online status, but does not independently confirm that the related restaurant's service area remains active.
- The deployed `dispatch-retry-cron` source contains a hard-coded cron secret. Remove it from source, store the replacement as a Supabase Edge Function secret, and rotate the existing value before deploying a corrected function.
- The `riders` table has a `zone` field but no state field. A zone/LGA name alone is not a safe state+LGA identifier because names may overlap between states.

## Required implementation sequence

1. Retrieve the exact deployed source for each affected function and compare it to the repository. Commit reviewed source to `supabase/functions/<function-name>/index.ts`; never replace deployed functions with partial or reconstructed code.
2. Agree on a canonical location key for riders (prefer a location ID referencing `locations`; otherwise add a state field and enforce the pair). Do not infer state from an LGA name.
3. Add server-side active-area checks to order creation using the restaurant's actual state and LGA/zone. Return a clear client-safe error for inactive areas.
4. Validate rider onboarding against the same canonical location key. Do not allow a rider to select an inactive area.
5. Make dispatch and retry paths re-check active area and only select riders eligible for that same location. Handle already-paid orders safely if an area is deactivated; do not silently cancel or alter paid orders.
6. Move the cron secret to an environment variable, rotate the existing value, update the scheduler to send the replacement, and verify unauthorized requests fail.
7. Add tests for active/inactive areas, duplicate LGA names across states, missing location data, no eligible riders, and area deactivation between order creation and retry.
8. Verify RLS for `waitlist_submissions` and `waitlist_summary`, plus the Netlify preview and admin waitlist report.

## Current production state observed during review

At the time of review, active locations were Anambra / Awka South, Anambra / Nnewi North, Anambra / Onitsha North, and Anambra / Onitsha South. This is a read-only observation, not a recommendation to change service coverage.

## Release guardrails

- This review branch is not permission to deploy Edge Functions or change production data.
- Do not merge until the live-source reconciliation, automated checks, and test-environment verification above are complete.
- Never commit service-role keys, cron secrets, API keys, or customer waitlist emails.
