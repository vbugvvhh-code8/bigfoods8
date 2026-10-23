'use client';

import {useEffect, useState} from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type {Order} from '@/types/database';

export interface OrderWithRestaurant extends Order {
  restaurantName: string | null;
  itemCount: number;
  batchDeliveryFee: number;
  batchTipAmount: number;
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
        // A checkout attempt is not an order until Paystack confirms payment.
        // Exclude pending/failed payment attempts from the customer's order history.
        .eq('payment_status', 'paid')
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

      const batchIds = Array.from(new Set((orderRows ?? []).map((o) => o.delivery_batch_id).filter((id): id is string => !!id)));
      const {data: batchRows} = batchIds.length
        ? await supabase.from('delivery_batches').select('id, delivery_fee, tip_amount').in('id', batchIds)
        : {data: []};

      const enriched = (orderRows ?? []).map((o) => {
        const batch = batchRows?.find((b) => b.id === o.delivery_batch_id);
        return {
          ...o,
          restaurantName: restaurants?.find((r) => r.id === o.restaurant_id)?.name ?? null,
          itemCount: (itemRows ?? []).filter((i) => i.order_id === o.id).reduce((sum, i) => sum + i.quantity, 0),
          // Multi-restaurant delivery and tip charges live on the batch, not each order leg.
          batchDeliveryFee: Number(batch?.delivery_fee ?? 0),
          batchTipAmount: Number(batch?.tip_amount ?? 0),
        };
      });

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
