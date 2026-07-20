import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Figures out where a restaurant owner should land after logging in, based
 * on what's actually saved in the database — not localStorage, since that
 * draft is device-local and won't exist if they log in somewhere new.
 * Walks the same sequence as ONBOARDING_STEPS and returns the first
 * incomplete step, or the dashboard if everything (including the
 * verification fee) is done.
 */
export async function resolveRestaurantEntryPath(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return '/restaurant-portal/login';

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, latitude, longitude, delivery_radius_km')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!restaurant) return '/restaurant-portal/onboarding/restaurant-info';
  if (restaurant.latitude == null || restaurant.longitude == null) {
    return '/restaurant-portal/onboarding/location';
  }
  if (restaurant.delivery_radius_km == null) {
    return '/restaurant-portal/onboarding/delivery-zone';
  }

  const { count: menuItemCount } = await supabase
    .from('menu_items')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurant.id);
  if (!menuItemCount) return '/restaurant-portal/onboarding/menu';

  // The live payment step only ever creates `type: 'promotion'` transactions
  // — 'verification_fee' isn't part of the actual onboarding flow, so
  // checking for it here meant this could never resolve to "complete" for
  // any restaurant, regardless of payment. Checking promotion success instead.
  const { data: promotionTxn } = await supabase
    .from('transactions')
    .select('id')
    .eq('restaurant_id', restaurant.id)
    .eq('type', 'promotion')
    .eq('status', 'success')
    .maybeSingle();
  if (!promotionTxn) return '/restaurant-portal/onboarding/payment';

  return '/restaurant-portal/dashboard';
}
