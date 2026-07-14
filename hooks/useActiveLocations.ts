'use client';

import { useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

export interface LocationOption {
  lga: string;
  senatorialZone: string;
}

export default function useActiveLocations() {
  const supabase = getBrowserSupabase();
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('locations')
      .select('lga, senatorial_zone')
      .eq('is_active', true)
      .order('lga')
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
        } else {
          setLocations((data ?? []).map((d) => ({ lga: d.lga, senatorialZone: d.senatorial_zone })));
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return { locations, loading, error };
}
