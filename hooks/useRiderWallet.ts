'use client';

import { useCallback, useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type { Transaction, Payout } from '@/types/database';

export default function useRiderWallet(riderId: string | undefined) {
  const supabase = getBrowserSupabase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const refresh = useCallback(async () => {
    if (!riderId) { setLoading(false); return; }
    setLoading(true);
    const [{ data: txns }, { data: pays }] = await Promise.all([
      supabase.from('transactions').select('*').eq('rider_id', riderId).in('type', ['delivery_commission', 'cancellation_penalty']).order('created_at', { ascending: false }),
      supabase.from('payouts').select('*').eq('rider_id', riderId).order('requested_at', { ascending: false }),
    ]);
    setTransactions((txns as Transaction[]) ?? []);
    setPayouts((pays as Payout[]) ?? []);
    setLoading(false);
  }, [riderId, supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // cancellation_penalty rows are stored with a negative amount, so a plain
  // sum nets them out correctly against delivery_commission earnings.
  const earned = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const paidOut = payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const balance = earned - paidOut;
  const hasOpenRequest = payouts.some((p) => p.status === 'pending' || p.status === 'processing');

  const requestPayout = useCallback(async () => {
    setError(null);
    setRequesting(true);
    const { data, error: fnError } = await supabase.functions.invoke('rider-request-payout', { body: {} });
    setRequesting(false);
    if (fnError) { setError(fnError.message); return false; }
    if (data?.error) { setError(data.error); return false; }
    await refresh();
    return true;
  }, [supabase, refresh]);

  return { transactions, payouts, balance, hasOpenRequest, loading, error, requesting, requestPayout, refresh };
}
