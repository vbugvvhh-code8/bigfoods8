'use client';

import {useState, useCallback} from 'react';
import useSWR from 'swr';
import getBrowserSupabase from '@/lib/supabase/client';
import {enrichRestaurant} from '@/hooks/useRestaurants';
import type {Restaurant} from '@/types/database';
import type {RestaurantWithMeta} from '@/lib/customer/types';

export interface SearchResult extends RestaurantWithMeta {
  matchedDish?: {name: string; price: number};
}

interface SearchOptions {
  sortBy?: 'distance' | 'rating';
  filterUnder20Min?: boolean;
  filterOpenNow?: boolean;
}

async function runSearch(query: string): Promise<SearchResult[]> {
  const supabase = getBrowserSupabase();

  const [byName, byDish] = await Promise.all([
    supabase.from('restaurants').select('*').eq('approval_status', 'approved').ilike('name', `%${query}%`),
    supabase
      .from('visible_menu_items')
      .select('restaurant_id, name, price')
      .ilike('name', `%${query}%`)
      .limit(50),
  ]);

  if (byName.error) throw byName.error;
  if (byDish.error) throw byDish.error;

  const byId = new Map<string, {restaurant?: Restaurant; matchedDish?: {name: string; price: number}}>();

  for (const r of (byName.data ?? []) as Restaurant[]) {
    byId.set(r.id, {restaurant: r});
  }

  const dishRestaurantIds = Array.from(new Set((byDish.data ?? []).map((m) => m.restaurant_id).filter(Boolean))) as string[];
  const missingIds = dishRestaurantIds.filter((id) => !byId.has(id));

  if (missingIds.length > 0) {
    const {data: missingRestaurants, error} = await supabase
      .from('restaurants')
      .select('*')
      .eq('approval_status', 'approved')
      .in('id', missingIds);
    if (error) throw error;
    for (const r of (missingRestaurants ?? []) as Restaurant[]) {
      byId.set(r.id, {restaurant: r});
    }
  }

  for (const item of byDish.data ?? []) {
    if (!item.restaurant_id) continue;
    const entry = byId.get(item.restaurant_id);
    if (entry && !entry.matchedDish) {
      entry.matchedDish = {name: item.name, price: item.price};
    }
  }

  return Array.from(byId.values())
    .filter((e): e is {restaurant: Restaurant; matchedDish?: {name: string; price: number}} => !!e.restaurant)
    .map((e) => ({...enrichRestaurant(e.restaurant), matchedDish: e.matchedDish}));
}

export function useSearch(query: string, customerLat?: number, customerLng?: number) {
  const [options, setOptions] = useState<SearchOptions>({});

  const {data, isLoading, error} = useSWR(query ? ['search', query] : null, () => runSearch(query));

  const setSortBy = useCallback((sortBy: SearchOptions['sortBy']) => setOptions((prev) => ({...prev, sortBy})), []);
  const setFilterUnder20Min = useCallback((value: boolean) => setOptions((prev) => ({...prev, filterUnder20Min: value})), []);
  const setFilterOpenNow = useCallback((value: boolean) => setOptions((prev) => ({...prev, filterOpenNow: value})), []);

  let results = (data ?? []).map((r) => ({
    ...r,
    distanceKm:
      customerLat != null && customerLng != null && r.latitude != null && r.longitude != null
        ? enrichRestaurant(r, customerLat, customerLng).distanceKm
        : r.distanceKm,
  }));

  if (options.filterOpenNow) results = results.filter((r) => r.isOpenNow);
  if (options.filterUnder20Min) results = results.filter((r) => r.etaMinutes != null && r.etaMinutes <= 20);
  if (options.sortBy === 'rating') results = [...results].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (options.sortBy === 'distance') {
    results = [...results].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }

  return {results, isLoading, error, options, setSortBy, setFilterUnder20Min, setFilterOpenNow};
}
