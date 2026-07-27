'use client';

import { useCallback, useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

export interface OpenTransfer {
  id: string;
  order_id: string;
  reward_pct: number;
  cancellation_reason: string;
  original_rider_lat: number | null;
  original_rider_lng: number | null;
  created_at: string;
}

export interface ClaimedTransfer {
  id: string;
  order_id: string;
  reward_pct: number;
  status: string;
}

export default function useRiderTransfers(riderId: string | undefined) {
  const supabase = getBrowserSupabase();
  const [openTransfers, setOpenTransfers] = useState<OpenTransfer[]>([]);
  const [myClaimed, setMyClaimed] = useState<ClaimedTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!riderId) { setLoading(false); return; }
    setLoading(true);
    const [{ data: open }, { data: claimed }] = await Promise.all([
      supabase
        .from('rider_transfers')
        .select('id, order_id, reward_pct, cancellation_reason, original_rider_lat, original_rider_lng, created_at')
        .eq('status', 'open')
        .neq('original_rider_id', riderId)
        .order('created_at', { ascending: false }),
      supabase
        .from('rider_transfers')
        .select('id, order_id, reward_pct, status')
        .eq('new_rider_id', riderId)
        .eq('status', 'claimed')
        .maybeSingle(),
    ]);
    setOpenTransfers((open as OpenTransfer[]) ?? []);
    setMyClaimed((claimed as ClaimedTransfer) ?? null);
    setLoading(false);
  }, [riderId, supabase]);

  useEffect(() => {
    refresh();
    // Open transfers are time-sensitive (someone's stuck holding food) --
    // poll rather than waiting for a manual refresh.
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  const accept = useCallback(
    async (transferId: string) => {
      setError(null);
      setBusy(true);
      const { data, error: fnError } = await supabase.functions.invoke('rider-accept-transfer', {
        body: { transfer_id: transferId },
      });
      setBusy(false);
      if (fnError) { setError(fnError.message); return false; }
      if (data?.error) { setError(data.error); return false; }
      await refresh();
      return true;
    },
    [supabase, refresh]
  );

  const confirmHandoff = useCallback(
    async (transferId: string, code: string) => {
      setError(null);
      setBusy(true);
      const { data, error: fnError } = await supabase.functions.invoke('rider-confirm-handoff', {
        body: { transfer_id: transferId, code },
      });
      setBusy(false);
      if (fnError) { setError(fnError.message); return false; }
      if (data?.error) { setError(data.error); return false; }
      await refresh();
      return true;
    },
    [supabase, refresh]
  );

  return { openTransfers, myClaimed, loading, error, busy, accept, confirmHandoff, refresh };
}
