'use client';

import { useCallback, useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type { RestaurantPayout } from '@/types/database';

export interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code: string;
  verified: boolean;
  updated_at: string;
}

const FEE_RATE = 0.05;
export const MIN_WITHDRAWAL = 10000;

/**
 * "Available balance" is estimated client-side the same way it always was,
 * for display purposes only — the actual withdrawal request is validated
 * authoritatively server-side in the restaurant-payout-request edge
 * function, which recomputes this independently and does not trust
 * whatever number this hook shows. This estimate existing does not mean
 * it's safe to skip that server check anywhere else.
 */
export default function useWallet(restaurantId?: string) {
  const supabase = getBrowserSupabase();
  const [payouts, setPayouts] = useState<RestaurantPayout[]>([]);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [estimatedBalance, setEstimatedBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);

    const [{ data: orders }, { data: payoutRows }, { data: bank }] = await Promise.all([
      supabase.from('orders').select('subtotal, platform_fee').eq('restaurant_id', restaurantId).eq('status', 'delivered'),
      supabase.from('restaurant_payouts').select('*').eq('restaurant_id', restaurantId).order('requested_at', { ascending: false }),
      supabase.from('restaurant_bank_accounts').select('*').eq('restaurant_id', restaurantId).maybeSingle(),
    ]);

    const netEarnings = (orders ?? []).reduce((sum, o) => sum + Number(o.subtotal) - Number(o.platform_fee ?? 0), 0);
    const deducted = (payoutRows ?? [])
      .filter((p) => p.status !== 'rejected')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    setEstimatedBalance(Math.max(0, netEarnings - deducted));
    setPayouts((payoutRows as RestaurantPayout[]) ?? []);
    setBankAccount((bank as BankAccount) ?? null);
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

  const saveBankAccount = useCallback(
    async (account: { account_number: string; bank_code: string; bank_name: string }) => {
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke('restaurant-save-bank-account', {
        body: account,
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

  const hasUnpaidRequest = payouts.some((p) => p.status === 'pending' || p.status === 'processing');

  function estimateBreakdown(amount: number) {
    const fee = Math.round(amount * FEE_RATE * 100) / 100;
    return { fee, net: amount - fee };
  }

  return {
    payouts,
    bankAccount,
    estimatedBalance,
    loading,
    error,
    hasUnpaidRequest,
    requestPayout,
    saveBankAccount,
    estimateBreakdown,
    refresh,
  };
}
