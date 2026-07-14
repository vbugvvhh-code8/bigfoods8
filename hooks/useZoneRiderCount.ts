'use client';

import { useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Live count of online riders within `radiusKm` of (latitude, longitude),
 * using riders.lat/lng directly (confirmed present on the live schema).
 * Filtering happens client-side after fetching online riders — fine at the
 * current rider-count scale; worth moving into a Postgres function (e.g. a
 * PostGIS radius query) if the rider roster grows large.
 */
export default function useZoneRiderCount(latitude?: number, longitude?: number, radiusKm?: number) {
  const supabase = getBrowserSupabase();
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!latitude || !longitude || !radiusKm) {
      setCount(null);
      return;
    }
    let cancelled = false;
    setLoading(true);

    supabase
      .from('riders')
      .select('lat, lng')
      .eq('status', 'online')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setCount(null);
        } else {
          const withinRadius = data.filter(
            (r) => haversineKm(latitude, longitude, Number(r.lat), Number(r.lng)) <= radiusKm
          );
          setCount(withinRadius.length);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, radiusKm, supabase]);

  return { count, loading };
}
