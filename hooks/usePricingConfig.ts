'use client';

import { useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

export default function usePricingConfig(keys: string[]) {
  const supabase = getBrowserSupabase();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('pricing_config')
      .select('key, value')
      .in('key', keys)
      .then(({ data }) => {
        if (cancelled) return;
        const map: Record<string, number> = {};
        (data ?? []).forEach((row) => {
          map[row.key] = Number(row.value);
        });
        setPrices(map);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join(','), supabase]);

  return { prices, loading };
}
