// Single source of truth on the frontend for the public launch date.
// Edge functions (paystack-verify) duplicate this exact value since there's
// no shared module between Deno edge functions and the Next.js app — update
// both places if this date ever changes.
export const PUBLIC_LAUNCH_DATE = new Date('2026-09-30T00:00:00Z');

export function isBeforeLaunch(): boolean {
  return new Date() < PUBLIC_LAUNCH_DATE;
}
