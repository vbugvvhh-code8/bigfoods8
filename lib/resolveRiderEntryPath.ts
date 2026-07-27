import { computeResumeStep, RIDER_ONBOARDING_STEPS } from '@/hooks/useRiderOnboardingSession';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Decides where a signed-in rider should land. Riders (unlike restaurants
 * before their Step 1) get a `riders` row as soon as the Details step is
 * saved, so this can rely entirely on the server row -- no local-draft
 * branch is needed the way resolveRestaurantEntryPath has for Step 1.
 */
export async function resolveRiderEntryPath(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return '/rider-portal/login';

  const { data: row } = await supabase
    .from('riders')
    .select(
      'name, phone, email, vehicle_type, plate_number, id_number, face_photo_url, id_front_url, id_back_url, lat, lng, verification_fee_paid'
    )
    .eq('profile_id', user.id)
    .maybeSingle();

  const step = computeResumeStep(row);

  if (row && row.verification_fee_paid) {
    return '/rider-portal/dashboard';
  }

  const target = RIDER_ONBOARDING_STEPS.find((s) => s.id === step);
  return target?.path ?? '/rider-portal/onboarding/details';
}
