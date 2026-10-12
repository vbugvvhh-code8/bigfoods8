'use client';

import { useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

export interface AcceptedBank {
  code: string;
  name: string;
}

/** Banks BigFoods pays out to, managed by admins in the accepted_banks table. */
export default function useAcceptedBanks() {
  const supabase = getBrowserSupabase();
  const [banks, setBanks] = useState<AcceptedBank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('accepted_banks')
      .select('code, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (cancelled) return;
        setBanks((data as AcceptedBank[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return { banks, loading };
}
