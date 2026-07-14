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

// Assumed average moped speed in Nigerian urban traffic, for a rough ETA only.
const ASSUMED_SPEED_KMH = 25;

export default function useNearestRider(latitude?: number, longitude?: number) {
  const supabase = getBrowserSupabase();
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!latitude || !longitude) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    supabase
      .from('riders')
      .select('lat, lng')
      .eq('status', 'online')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .then(({ data }) => {
        if (cancelled) return;
        if (!data || data.length === 0) {
          setEtaMinutes(null);
        } else {
          const nearestKm = Math.min(
            ...data.map((r) => haversineKm(latitude, longitude, Number(r.lat), Number(r.lng)))
          );
          setEtaMinutes(Math.max(1, Math.round((nearestKm / ASSUMED_SPEED_KMH) * 60)));
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, supabase]);

  return { etaMinutes, loading };
}
