'use client';

import { useCallback, useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type { Order } from '@/types/database';

const ACTIVE_STATUSES = ['placed', 'preparing', 'picked_up'];

export default function useRiderActiveOrder(riderId: string | undefined) {
  const supabase = getBrowserSupabase();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!riderId) { setOrder(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('rider_id', riderId)
      .in('status', ACTIVE_STATUSES)
      .order('placed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setOrder((data as Order) ?? null);
    setLoading(false);
  }, [riderId, supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { order, loading, refresh };
}
