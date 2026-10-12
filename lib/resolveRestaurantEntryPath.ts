import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Figures out where a restaurant owner should land after logging in, based
 * on what's actually saved in the database — not localStorage, since that
 * draft is device-local and won't exist if they log in somewhere new.
 *
 * New flow order (matches ONBOARDING_STEPS):
 *   business -> location -> bank -> plan payment -> delivery zone -> menu -> dashboard
 * Payment comes before delivery zone and menu, so paid sellers can't be
 * stranded at a step they never reach.
 *
 * Restaurants created before this flow existed have no owner-details row.
 * They are left alone: they keep the original checks (location, delivery
 * zone, menu) and are never sent to the bank or plan steps.
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

  const { count: detailsCount } = await supabase
    .from('restaurant_owner_details')
    .select('restaurant_id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurant.id);
  const isLegacy = !detailsCount;

  if (restaurant.latitude == null || restaurant.longitude == null) {
    return '/restaurant-portal/onboarding/location';
  }

  if (!isLegacy) {
    const { count: bankCount } = await supabase
      .from('restaurant_bank_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id);
    if (!bankCount) return '/restaurant-portal/onboarding/bank';

    // Count, not .maybeSingle(): more than one matching row would make
    // .maybeSingle() throw and silently misreport "not paid".
    const { count: planCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .eq('type', 'onboarding_plan')
      .eq('status', 'success');
    if (!planCount) return '/restaurant-portal/onboarding/payment';
  }

  if (restaurant.delivery_radius_km == null) {
    return '/restaurant-portal/onboarding/delivery-zone';
  }

  const { count: menuItemCount } = await supabase
    .from('menu_items')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurant.id);
  if (!menuItemCount) return '/restaurant-portal/onboarding/menu';

  return '/restaurant-portal/dashboard';
}
