'use client';

import {useEffect, useState} from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type {Order} from '@/types/database';

export interface OrderWithRestaurant extends Order {
  restaurantName: string | null;
  itemCount: number;
}

export function useMyOrders() {
  const supabase = getBrowserSupabase();
  const [orders, setOrders] = useState<OrderWithRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      // RLS ("Customers can view their own orders") scopes this to the
      // signed-in customer — no explicit .eq('customer_id', ...) needed.
      const {data: orderRows, error: orderError} = await supabase
        .from('orders')
        .select('*')
        .order('placed_at', {ascending: false});

      if (cancelled) return;
      if (orderError) {
        setError(orderError);
        setIsLoading(false);
        return;
      }

      const restaurantIds = Array.from(new Set((orderRows ?? []).map((o) => o.restaurant_id).filter((id): id is string => !!id)));
      const {data: restaurants} = restaurantIds.length
        ? await supabase.from('restaurants').select('id, name').in('id', restaurantIds)
        : {data: []};

      const orderIds = (orderRows ?? []).map((o) => o.id);
      const {data: itemRows} = orderIds.length
        ? await supabase.from('order_items').select('order_id, quantity').in('order_id', orderIds)
        : {data: []};

      const enriched = (orderRows ?? []).map((o) => ({
        ...o,
        restaurantName: restaurants?.find((r) => r.id === o.restaurant_id)?.name ?? null,
        itemCount: (itemRows ?? []).filter((i) => i.order_id === o.id).reduce((sum, i) => sum + i.quantity, 0),
      }));

      if (!cancelled) {
        setOrders(enriched);
        setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {orders, isLoading, error};
}
