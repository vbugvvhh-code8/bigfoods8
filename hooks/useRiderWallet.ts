'use client';

import { useCallback, useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type { Transaction, Payout } from '@/types/database';

export const MIN_WITHDRAWAL_FALLBACK = 50000;

// Must match rider-request-payout's EARNING_TYPES exactly, or the balance
// shown here won't match what withdrawing actually pays out.
const EARNING_TYPES = [
  'delivery_commission',
  'delivery_commission_transfer',
  'delivery_commission_transfer_original',
  'cancellation_penalty',
];

export interface RiderBankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code: string;
  verified: boolean;
}

export default function useRiderWallet(riderId: string | undefined) {
  const supabase = getBrowserSupabase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [bankAccount, setBankAccount] = useState<RiderBankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  const refresh = useCallback(async () => {
    if (!riderId) { setLoading(false); return; }
    setLoading(true);
    const [{ data: txns }, { data: pays }, { data: bank }] = await Promise.all([
      supabase.from('transactions').select('*').eq('rider_id', riderId).in('type', EARNING_TYPES).order('created_at', { ascending: false }),
      supabase.from('payouts').select('*').eq('rider_id', riderId).order('requested_at', { ascending: false }),
      supabase.from('rider_bank_accounts').select('*').eq('rider_id', riderId).maybeSingle(),
    ]);
    setTransactions((txns as Transaction[]) ?? []);
    setPayouts((pays as Payout[]) ?? []);
    setBankAccount((bank as RiderBankAccount) ?? null);
    setLoading(false);
  }, [riderId, supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // cancellation_penalty rows are stored with a negative amount, so a plain
  // sum nets them out correctly against the earning types.
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

  // First-ever save goes straight through. Any change after that comes back
  // with requires_code -- caller should prompt for the emailed code and call
  // confirmBankChange with it.
  const saveBankAccount = useCallback(
    async (fields: { account_number: string; bank_code: string; bank_name: string }) => {
      setError(null);
      setSavingBank(true);
      const { data, error: fnError } = await supabase.functions.invoke('rider-save-bank-account', { body: fields });
      setSavingBank(false);
      if (fnError) { setError(fnError.message); return { ok: false, requiresCode: false }; }
      if (data?.requires_code) return { ok: false, requiresCode: true };
      if (data?.error) { setError(data.error); return { ok: false, requiresCode: false }; }
      await refresh();
      return { ok: true, requiresCode: false };
    },
    [supabase, refresh]
  );

  const confirmBankChange = useCallback(
    async (fields: { code: string; account_number: string; bank_code: string; bank_name: string }) => {
      setError(null);
      setSavingBank(true);
      const { data, error: fnError } = await supabase.functions.invoke('rider-confirm-bank-change', { body: fields });
      setSavingBank(false);
      if (fnError) { setError(fnError.message); return false; }
      if (data?.error) { setError(data.error); return false; }
      await refresh();
      return true;
    },
    [supabase, refresh]
  );

  return {
    transactions,
    payouts,
    bankAccount,
    balance,
    hasOpenRequest,
    loading,
    error,
    requesting,
    savingBank,
    requestPayout,
    saveBankAccount,
    confirmBankChange,
    refresh,
  };
}
