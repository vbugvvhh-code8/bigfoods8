'use client';

import { useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type { Order } from '@/types/database';

export default function useRestaurantReports(restaurantId?: string) {
  const supabase = getBrowserSupabase();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    setLoading(true);

    supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('placed_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (cancelled) return;
        setOrders((data as Order[]) ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [restaurantId, supabase]);

  const totalOrders = orders.length;
  const delivered = orders.filter((o) => o.status === 'delivered');
  const totalRevenue = delivered.reduce((sum, o) => sum + Number(o.subtotal), 0);
  const avgDeliveryMinutes = delivered.length
    ? Math.round(delivered.reduce((sum, o) => sum + Number(o.delivery_minutes ?? 0), 0) / delivered.length)
    : null;

  return { orders, loading, totalOrders, deliveredCount: delivered.length, totalRevenue, avgDeliveryMinutes };
}
