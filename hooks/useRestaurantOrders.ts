'use client';

import { useEffect, useState, useCallback } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type { SelectedMenuOption } from '@/types/database';

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
  items: { id: string; name: string; quantity: number; unit_price: number; selected_options: SelectedMenuOption[] }[];
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
    const orderRows = (data as any[]) ?? [];
    const orderIds = orderRows.map((order) => order.id);
    const { data: orderItems } = orderIds.length
      ? await supabase.from('order_items').select('id, order_id, menu_item_id, quantity, unit_price, selected_options').in('order_id', orderIds)
      : { data: [] };
    const menuItemIds = Array.from(new Set((orderItems ?? []).map((item: any) => item.menu_item_id).filter((id: string | null): id is string => !!id)));
    const { data: menuItems } = menuItemIds.length
      ? await supabase.from('menu_items').select('id, name').in('id', menuItemIds)
      : { data: [] };
    setOrders(orderRows.map((order) => ({
      ...order,
      rider: order.riders ?? null,
      items: (orderItems ?? []).filter((item: any) => item.order_id === order.id).map((item: any) => ({
        id: item.id,
        name: menuItems?.find((menuItem: any) => menuItem.id === item.menu_item_id)?.name ?? 'Menu item',
        quantity: Number(item.quantity ?? 1),
        unit_price: Number(item.unit_price ?? 0),
        selected_options: (item.selected_options ?? []) as SelectedMenuOption[],
      })),
    })));
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

  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
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

  return { orders, active, history, loading, updateStatus, ordersToday, statusBreakdown, refresh: fetchOrders };
}
