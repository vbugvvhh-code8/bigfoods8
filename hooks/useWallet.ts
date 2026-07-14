'use client';

import { useCallback, useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type { RestaurantPayout } from '@/types/database';

/**
 * "Available balance" isn't a defined concept anywhere in the schema or the
 * handoff doc — there's no ledger column for it. This estimates it as
 * (delivered-order subtotals minus platform fees) minus (paid + pending
 * payout amounts). That revenue-share formula is an assumption, not a
 * confirmed business rule — flag before relying on it for real payouts.
 */
export default function useWallet(restaurantId?: string) {
  const supabase = getBrowserSupabase();
  const [payouts, setPayouts] = useState<RestaurantPayout[]>([]);
  const [estimatedBalance, setEstimatedBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);

    const [{ data: orders }, { data: payoutRows }] = await Promise.all([
      supabase.from('orders').select('subtotal, platform_fee').eq('restaurant_id', restaurantId).eq('status', 'delivered'),
      supabase.from('restaurant_payouts').select('*').eq('restaurant_id', restaurantId).order('requested_at', { ascending: false }),
    ]);

    const netEarnings = (orders ?? []).reduce((sum, o) => sum + Number(o.subtotal) - Number(o.platform_fee ?? 0), 0);
    const deducted = (payoutRows ?? [])
      .filter((p) => p.status !== 'rejected')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    setEstimatedBalance(Math.max(0, netEarnings - deducted));
    setPayouts((payoutRows as RestaurantPayout[]) ?? []);
    setLoading(false);
  }, [restaurantId, supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestPayout = useCallback(
    async (amount: number) => {
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke('restaurant-payout-request', {
        body: { amount },
      });
      if (fnError) {
        setError(fnError.message);
        return false;
      }
      if (data?.error) {
        setError(data.error);
        return false;
      }
      await refresh();
      return true;
    },
    [supabase, refresh]
  );

  return { payouts, estimatedBalance, loading, error, requestPayout, refresh };
}
