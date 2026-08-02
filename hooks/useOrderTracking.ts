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

export interface BatchStop {
  restaurantId: string;
  name: string;
  lat: number | null;
  lng: number | null;
  pickedUp: boolean;
}

export interface BatchInfo {
  id: string;
  status: string;
  deliveryCode: string | null;
  stops: BatchStop[];
}

export function useOrderTracking(orderId: string) {
  const supabase = getBrowserSupabase();
  const [order, setOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [items, setItems] = useState<OrderItemDisplay[]>([]);
  const [rider, setRider] = useState<Rider | null>(null);
  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

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

      // Batched order: this leg is one of up to 3 restaurants the same
      // rider is visiting before dropping everything off to the customer
      // in one go. Load the sibling legs so the map/page can show the
      // whole route, and use the BATCH's delivery_code (the individual
      // order's own code is null for batched legs -- see rider-update-delivery).
      if (orderData.delivery_batch_id) {
        const {data: batchRow} = await supabase
          .from('delivery_batches')
          .select('id, status, delivery_code, route_sequence')
          .eq('id', orderData.delivery_batch_id)
          .single();

        if (batchRow?.route_sequence?.length) {
          const {data: siblingOrders} = await supabase
            .from('orders')
            .select('restaurant_id, status')
            .eq('delivery_batch_id', orderData.delivery_batch_id);

          const {data: stopRestaurants} = await supabase
            .from('restaurants')
            .select('id, name, latitude, longitude')
            .in('id', batchRow.route_sequence as string[]);

          const stops: BatchStop[] = (batchRow.route_sequence as string[]).map((rid) => {
            const rInfo = stopRestaurants?.find((r) => r.id === rid);
            const legStatus = siblingOrders?.find((o) => o.restaurant_id === rid)?.status;
            return {
              restaurantId: rid,
              name: rInfo?.name ?? 'Restaurant',
              lat: rInfo?.latitude ?? null,
              lng: rInfo?.longitude ?? null,
              pickedUp: legStatus === 'picked_up' || legStatus === 'delivered',
            };
          });

          if (!cancelled) {
            setBatch({id: batchRow.id, status: batchRow.status, deliveryCode: batchRow.delivery_code, stops});
          }
        }
      } else {
        setBatch(null);
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

  // Live batch status (so a sibling leg getting picked up updates this
  // page's "stops" list without a manual refresh).
  useEffect(() => {
    if (!order?.delivery_batch_id) return;
    const channel = supabase
      .channel(`batch-${order.delivery_batch_id}`)
      .on(
        'postgres_changes',
        {event: 'UPDATE', schema: 'public', table: 'orders', filter: `delivery_batch_id=eq.${order.delivery_batch_id}`},
        (payload) => {
          const updated = payload.new as Order;
          setBatch((prev) =>
            prev
              ? {
                  ...prev,
                  stops: prev.stops.map((s) =>
                    s.restaurantId === updated.restaurant_id
                      ? {...s, pickedUp: updated.status === 'picked_up' || updated.status === 'delivered'}
                      : s
                  ),
                }
              : prev
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.delivery_batch_id, supabase]);

  // Rider location: initial fetch + live subscription, re-run whenever a
  // rider gets (re)assigned. Riders push a location update roughly every 5
  // minutes; this fires the moment that row actually changes rather than
  // polling on a fixed interval. order.rider_id is kept in sync with the
  // batch's rider_id (see paystack-verify / dispatch-retry-cron), so this
  // works unchanged for both plain and batched orders.
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

  // The rider's CURRENT leg destination -- the restaurant (or next
  // unvisited stop in a batch) while still collecting, the customer once
  // everything's picked up. Previously the map always measured distance to
  // the customer even pre-pickup, which was meaningless while the rider was
  // still on their way to a restaurant.
  const currentDestination: {lat: number; lng: number; label: string} | null = (() => {
    if (!order) return null;
    const stillCollecting = order.status === 'placed' || order.status === 'preparing';
    if (stillCollecting) {
      if (batch) {
        const nextStop = batch.stops.find((s) => !s.pickedUp);
        if (nextStop?.lat != null && nextStop?.lng != null) {
          return {lat: nextStop.lat, lng: nextStop.lng, label: nextStop.name};
        }
      }
      if (restaurant?.latitude != null && restaurant?.longitude != null) {
        return {lat: restaurant.latitude, lng: restaurant.longitude, label: restaurant.name};
      }
      return null;
    }
    if (order.delivery_lat != null && order.delivery_lng != null) {
      return {lat: order.delivery_lat, lng: order.delivery_lng, label: 'Your location'};
    }
    return null;
  })();

  return {order, restaurant, items, rider, batch, currentDestination, isLoading, error};
}
