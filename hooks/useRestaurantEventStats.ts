'use client';

import { useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type { DateRange } from '@/hooks/useRestaurantAnalytics';

function rangeStart(range: DateRange): Date {
  const start = new Date();
  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
  } else {
    const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;
    start.setDate(start.getDate() - days);
  }
  return start;
}

export default function useRestaurantEventStats(restaurantId?: string, range: DateRange = '7d') {
  const supabase = getBrowserSupabase();
  const [events, setEvents] = useState<{ event_type: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('restaurant_events')
      .select('event_type, created_at')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', rangeStart(range).toISOString())
      .then(({ data }) => {
        if (cancelled) return;
        setEvents(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, range, supabase]);

  const cardImpressions = events.filter((e) => e.event_type === 'card_impression').length;
  const cardClicks = events.filter((e) => e.event_type === 'card_click').length;
  const pageViews = events.filter((e) => e.event_type === 'page_view').length;
  // CTR is clicks divided by visible card impressions, not page views divided by clicks.
  const clickThroughRate = cardImpressions > 0 ? Math.round((cardClicks / cardImpressions) * 100) : null;

  const days = range === 'today' ? 1 : range === '7d' ? 7 : range === '14d' ? 14 : 30;
  const dailyViews: { label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const value = events.filter(
      (e) => e.event_type === 'page_view' && new Date(e.created_at) >= day && new Date(e.created_at) < next
    ).length;
    dailyViews.push({ label: day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), value });
  }

  return { loading, cardImpressions, cardClicks, pageViews, clickThroughRate, dailyViews };
}
