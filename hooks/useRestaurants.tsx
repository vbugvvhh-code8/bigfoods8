'use client';

import useSWR from 'swr';
import getBrowserSupabase from '@/lib/supabase/client';
import type {Restaurant} from '@/types/database';
import type {RestaurantWithMeta} from '@/lib/customer/types';
import {isRestaurantOpenNow} from '@/lib/customer/restaurant-status';
import {haversineKm, estimateEtaMinutes} from '@/lib/customer/distance';

export function enrichRestaurant(restaurant: Restaurant, customerLat?: number, customerLng?: number): RestaurantWithMeta {
  const hasCoords = customerLat != null && customerLng != null && restaurant.latitude != null && restaurant.longitude != null;
  const distanceKm = hasCoords
    ? haversineKm(customerLat!, customerLng!, restaurant.latitude!, restaurant.longitude!)
    : null;

  return {
    ...restaurant,
    isOpenNow: isRestaurantOpenNow(restaurant),
    distanceKm,
    etaMinutes: distanceKm != null ? estimateEtaMinutes(distanceKm) : null,
    inDeliveryRange:
      distanceKm != null && restaurant.delivery_radius_km != null ? distanceKm <= restaurant.delivery_radius_km : null,
  };
}

export function useRestaurants(options?: {
  category?: string;
  featuredOnly?: boolean;
  customerLat?: number;
  customerLng?: number;
}) {
  const supabase = getBrowserSupabase();

  const {data, isLoading, error} = useSWR(
    ['restaurants', options?.category, options?.featuredOnly],
    async () => {
      // Querying the base table, not `visible_restaurants` — that view only
      // exposes 8 columns (no is_featured/is_accepting_orders/lat/lng/etc),
      // which we need. RLS's "Public can view non-seed or currently-visible
      // restaurants" policy applies identically either way, so this is no
      // less safe. `approval_status` isn't filtered by RLS or the view, so
      // we filter it here — customers should never see pending/rejected
      // restaurants.
      let query = supabase
        .from('restaurants')
        .select('*')
        .eq('approval_status', 'approved')
        .order('rating', {ascending: false});

      if (options?.category && options.category !== 'All') {
        query = query.eq('category', options.category);
      }
      if (options?.featuredOnly) {
        query = query.eq('is_featured', true);
      }

      const {data, error} = await query;
      if (error) throw error;
      return data as Restaurant[];
    }
  );

  const restaurants = (data ?? []).map((r) => enrichRestaurant(r, options?.customerLat, options?.customerLng));

  return {restaurants, isLoading, error};
}

export function useRestaurant(id: string, customerLat?: number, customerLng?: number) {
  const supabase = getBrowserSupabase();

  const {data, isLoading, error} = useSWR(['restaurant', id], async () => {
    const {data, error} = await supabase.from('restaurants').select('*').eq('id', id).eq('approval_status', 'approved').single();
    if (error) throw error;
    return data as Restaurant;
  });

  const restaurant = data ? enrichRestaurant(data, customerLat, customerLng) : undefined;

  return {restaurant, isLoading, error};
}
