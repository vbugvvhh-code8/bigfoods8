'use client';

import { useState } from 'react';
import { mutate as globalMutate } from 'swr';
import getBrowserSupabase from '@/lib/supabase/client';

export default function useDisputeAction() {
  const supabase = getBrowserSupabase();
  const [loadingIds, setLoadingIds] = useState<string[]>([]);

  async function resolveDispute(id: string, status: 'investigating' | 'resolved' | 'dismissed', resolution_notes?: string) {
    setLoadingIds((s) => [...s, id]);
    const { error } = await supabase.functions.invoke('admin-resolve-dispute', {
      body: { dispute_id: id, status, resolution_notes },
    });
    await globalMutate('admin-query:disputes');
    setLoadingIds((s) => s.filter((x) => x !== id));
    if (error) throw error;
  }

  return { resolveDispute, loadingIds };
}
