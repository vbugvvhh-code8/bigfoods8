'use client';

import { useEffect, useMemo, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

export type DateRange = 'today' | '7d' | '14d' | '30d';

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

export interface ItemSales {
  name: string;
  quantity: number;
}

/**
 * Shared across Overview, Wallet, and Reports so all three tabs agree on the
 * same numbers for the same date range — one query path, not three
 * independently-drifting ones.
 */
export default function useRestaurantAnalytics(restaurantId: string | undefined, range: DateRange) {
  const supabase = getBrowserSupabase();
  const [orders, setOrders] = useState<any[]>([]);
  const [itemSales, setItemSales] = useState<ItemSales[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    setLoading(true);
    const since = rangeStart(range).toISOString();

    (async () => {
      const { data: orderRows } = await supabase
        .from('orders')
        .select('id, status, subtotal, delivery_minutes, placed_at')
        .eq('restaurant_id', restaurantId)
        .gte('placed_at', since)
        .order('placed_at', { ascending: true });

      const orderIds = (orderRows ?? []).map((o) => o.id);
      let items: any[] = [];
      if (orderIds.length > 0) {
        const { data: itemRows } = await supabase
          .from('order_items')
          .select('quantity, order_id, menu_items(name)')
          .in('order_id', orderIds);
        items = itemRows ?? [];
      }

      if (cancelled) return;
      setOrders(orderRows ?? []);

      const tally: Record<string, number> = {};
      for (const row of items) {
        const name = row.menu_items?.name ?? 'Unknown item';
        tally[name] = (tally[name] ?? 0) + (row.quantity ?? 0);
      }
      const sales = Object.entries(tally)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity);
      setItemSales(sales);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [restaurantId, range, supabase]);

  const delivered = useMemo(() => orders.filter((o) => o.status === 'delivered'), [orders]);
  const totalEarnings = useMemo(() => delivered.reduce((sum, o) => sum + Number(o.subtotal ?? 0), 0), [delivered]);
  const avgDeliveryMinutes = delivered.length
    ? Math.round(delivered.reduce((sum, o) => sum + Number(o.delivery_minutes ?? 0), 0) / delivered.length)
    : null;
  const bestSellingItem = itemSales[0]?.name ?? null;

  const dailyRevenue = useMemo(() => {
    const days = range === 'today' ? 1 : range === '7d' ? 7 : range === '14d' ? 14 : 30;
    const buckets: { label: string; value: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const value = delivered
        .filter((o) => {
          const t = new Date(o.placed_at).getTime();
          return t >= day.getTime() && t < next.getTime();
        })
        .reduce((sum, o) => sum + Number(o.subtotal ?? 0), 0);
      buckets.push({ label: day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), value });
    }
    return buckets;
  }, [delivered, range]);

  return {
    loading,
    ordersCount: orders.length,
    deliveredCount: delivered.length,
    totalEarnings,
    avgDeliveryMinutes,
    bestSellingItem,
    itemSales,
    dailyRevenue,
  };
}
