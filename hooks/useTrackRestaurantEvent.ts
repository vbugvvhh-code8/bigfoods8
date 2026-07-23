'use client';

import { useEffect, useRef } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

/**
 * Fire-and-forget — never blocks or breaks the UI if it fails (a missed
 * analytics event is not worth showing an error or retry to the customer).
 */
export function trackRestaurantEvent(restaurantId: string, eventType: 'card_click' | 'page_view') {
  const supabase = getBrowserSupabase();
  supabase.from('restaurant_events').insert({ restaurant_id: restaurantId, event_type: eventType }).then(
    () => {},
    () => {}
  );
}

/** Drop into a restaurant detail page to log exactly one page_view per mount. */
export function useTrackRestaurantPageView(restaurantId?: string) {
  const logged = useRef(false);
  useEffect(() => {
    if (!restaurantId || logged.current) return;
    logged.current = true;
    trackRestaurantEvent(restaurantId, 'page_view');
  }, [restaurantId]);
}
