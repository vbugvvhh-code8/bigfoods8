'use client';

import {useEffect, useState} from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type {Restaurant, Rider, Order} from '@/types/database';

export interface OrderItemDisplay {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export function useOrderTracking(orderId: string) {
  const supabase = getBrowserSupabase();
  const [order, setOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [items, setItems] = useState<OrderItemDisplay[]>([]);
  const [rider, setRider] = useState<Rider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // Initial load, then subscribe to status changes (RLS already scopes this
  // to the customer's own order — "Customers can view their own orders").
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const {data: orderData, error: orderError} = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (cancelled) return;
      if (orderError || !orderData) {
        setError(orderError ?? new Error('Order not found'));
        setIsLoading(false);
        return;
      }
      setOrder(orderData as Order);

      if (orderData.restaurant_id) {
        const {data: r} = await supabase.from('restaurants').select('*').eq('id', orderData.restaurant_id).single();
        if (!cancelled) setRestaurant(r as Restaurant);
      }

      const {data: orderItems} = await supabase
        .from('order_items')
        .select('id, menu_item_id, quantity, unit_price')
        .eq('order_id', orderId);

      if (orderItems && orderItems.length > 0) {
        const menuItemIds = orderItems.map((i) => i.menu_item_id).filter((id): id is string => !!id);
        const {data: menuItems} = await supabase.from('menu_items').select('id, name').in('id', menuItemIds);
        const withNames = orderItems.map((i) => ({
          id: i.id,
          name: menuItems?.find((m) => m.id === i.menu_item_id)?.name ?? 'Item',
          quantity: i.quantity,
          unit_price: i.unit_price,
        }));
        if (!cancelled) setItems(withNames);
      }

      setIsLoading(false);
    }

    load();

    const orderChannel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}`},
        (payload) => {
          if (!cancelled) setOrder((prev) => (prev ? {...prev, ...(payload.new as Order)} : (payload.new as Order)));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(orderChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Rider location: initial fetch + live subscription, re-run whenever a
  // rider gets (re)assigned. Riders push a location update roughly every 5
  // minutes; this fires the moment that row actually changes rather than
  // polling on a fixed interval.
  useEffect(() => {
    if (!order?.rider_id) {
      setRider(null);
      return;
    }
    let cancelled = false;

    supabase
      .from('riders')
      .select('*')
      .eq('id', order.rider_id)
      .single()
      .then(({data}) => {
        if (!cancelled && data) setRider(data as Rider);
      });

    const riderChannel = supabase
      .channel(`rider-${order.rider_id}`)
      .on(
        'postgres_changes',
        {event: 'UPDATE', schema: 'public', table: 'riders', filter: `id=eq.${order.rider_id}`},
        (payload) => {
          if (!cancelled) setRider((prev) => (prev ? {...prev, ...(payload.new as Rider)} : (payload.new as Rider)));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(riderChannel);
    };
  }, [order?.rider_id, supabase]);

  return {order, restaurant, items, rider, isLoading, error};
}
