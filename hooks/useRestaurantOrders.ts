'use client';

import { useEffect, useState, useCallback } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

export interface OrderLineItem {
  id: string;
  quantity: number;
  unit_price: number;
  selected_options: { groupName?: string; optionName?: string; quantity?: number; price?: number }[];
  name: string;
}

export interface OrderRider {
  name: string;
  plate_number: string | null;
  vehicle_type: string | null;
}

export interface OrderWithRider {
  id: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  platform_fee: number;
  placed_at: string;
  delivered_at: string | null;
  delivery_address: string | null;
  delivery_code: string | null;
  rider_id: string | null;
  payment_status: string | null;
  zone: string | null;
  rider: OrderRider | null;
  items: OrderLineItem[];
}

const ACTIVE_STATUSES = ['placed', 'preparing', 'picked_up'];
const HISTORY_STATUSES = ['delivered', 'cancelled'];

export default function useRestaurantOrders(restaurantId?: string) {
  const supabase = getBrowserSupabase();
  const [orders, setOrders] = useState<OrderWithRider[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from('orders')
      .select(
        'id, status, subtotal, delivery_fee, platform_fee, placed_at, delivered_at, delivery_address, delivery_code, rider_id, payment_status, zone, riders(name, plate_number, vehicle_type)'
      )
      .eq('restaurant_id', restaurantId)
      .order('placed_at', { ascending: false })
      .limit(100);
    const fetchedOrders = (data as any[]) ?? [];
    const orderIds = fetchedOrders.map((o) => o.id);
    let lineItemsByOrder: Record<string, OrderLineItem[]> = {};
    if (orderIds.length) {
      const { data: lineItems } = await supabase
        .from('order_items')
        .select('id, order_id, quantity, unit_price, selected_options, menu_items(name)')
        .in('order_id', orderIds);
      for (const line of (lineItems as any[]) ?? []) {
        const orderId = line.order_id as string;
        if (!lineItemsByOrder[orderId]) lineItemsByOrder[orderId] = [];
        lineItemsByOrder[orderId].push({
          id: line.id,
          quantity: Number(line.quantity ?? 1),
          unit_price: Number(line.unit_price ?? 0),
          selected_options: Array.isArray(line.selected_options) ? line.selected_options : [],
          name: line.menu_items?.name ?? 'Menu item',
        });
      }
    }
    setOrders(fetchedOrders.map((o) => ({ ...o, rider: o.riders ?? null, items: lineItemsByOrder[o.id] ?? [] })));
    setLoading(false);
  }, [restaurantId, supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Live updates — new orders, status changes, rider assignment — without polling.
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`restaurant-orders-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchOrders()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, supabase, fetchOrders]);

  async function updateStatus(orderId: string, status: string) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) throw error;
    // Optimistic update for snappiness — the realtime subscription will also
    // confirm/reconcile this shortly after.
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  }

  const awaitingPayment = orders.filter((o) => ACTIVE_STATUSES.includes(o.status) && o.payment_status !== 'paid');
  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status) && o.payment_status === 'paid');
  const history = orders.filter((o) => HISTORY_STATUSES.includes(o.status));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ordersToday = orders.filter((o) => new Date(o.placed_at) >= today).length;

  const statusBreakdown = ['placed', 'preparing', 'picked_up', 'delivered', 'cancelled']
    .map((status) => ({
      name: status.replace('_', ' '),
      quantity: orders.filter((o) => o.status === status).length,
    }))
    .filter((s) => s.quantity > 0);

  return { orders, active, awaitingPayment, history, loading, updateStatus, ordersToday, statusBreakdown, refresh: fetchOrders };
}
