'use client';

import { useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

export default function useHasMenuItem(restaurantId?: string) {
  const supabase = getBrowserSupabase();
  const [hasItem, setHasItem] = useState<boolean | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setHasItem(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('menu_items')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .then(({ count }) => {
        if (!cancelled) setHasItem((count ?? 0) > 0);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, supabase]);

  return hasItem;
}
