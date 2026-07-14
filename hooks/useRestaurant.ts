'use client';

import { useCallback, useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type { Restaurant } from '@/types/database';

export interface RestaurantSaveFields {
  name?: string;
  category?: string;
  image_url?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  zone?: string;
  delivery_radius_km?: number;
}

export default function useRestaurant() {
  const supabase = getBrowserSupabase();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setRestaurant(null);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (fetchError) setError(fetchError.message);
    setRestaurant((data as Restaurant) ?? null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (fields: RestaurantSaveFields) => {
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke('restaurant-onboarding-save', {
        body: fields,
      });
      if (fnError) {
        setError(fnError.message);
        return null;
      }
      if (data?.error) {
        setError(data.error);
        return null;
      }
      setRestaurant(data.restaurant as Restaurant);
      return data.restaurant as Restaurant;
    },
    [supabase]
  );

  return { restaurant, loading, error, save, refresh };
}
