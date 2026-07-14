'use client';

import { useState } from 'react';
import { mutate as globalMutate } from 'swr';
import getBrowserSupabase from '@/lib/supabase/client';

export default function usePayoutAction() {
  const supabase = getBrowserSupabase();
  const [loadingIds, setLoadingIds] = useState<string[]>([]);

  async function processPayout(id: string, decision: 'processing' | 'paid' | 'rejected') {
    setLoadingIds((s) => [...s, id]);
    const { error } = await supabase.functions.invoke('admin-process-payout', {
      body: { payout_id: id, decision },
    });
    await globalMutate('admin-query:payouts_with_riders');
    setLoadingIds((s) => s.filter((x) => x !== id));
    if (error) throw error;
  }

  return { processPayout, loadingIds };
}
