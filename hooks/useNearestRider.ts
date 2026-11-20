'use client';

import { useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

// Assumed average moped speed in Nigerian urban traffic, for a rough ETA only.
const ASSUMED_SPEED_KMH = 25;

export default function useNearestRider(latitude?: number, longitude?: number, zone?: string | null) {
  const supabase = getBrowserSupabase();
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (latitude == null || longitude == null || !zone?.trim()) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    // nearest_online_rider_km() does the distance maths in the database so
    // rider positions are never sent to the browser.
    supabase
      .rpc('nearest_online_rider_km', { p_lat: latitude, p_lng: longitude, p_zone: zone.trim() })
      .then(({ data, error }) => {
        if (cancelled) return;
        const nearestKm = typeof data === 'number' ? data : data == null ? null : Number(data);
        if (error || nearestKm == null || !Number.isFinite(nearestKm)) {
          setEtaMinutes(null);
        } else {
          setEtaMinutes(Math.max(1, Math.round((nearestKm / ASSUMED_SPEED_KMH) * 60)));
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, zone, supabase]);

  return { etaMinutes, loading };
}
