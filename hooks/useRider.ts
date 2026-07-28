'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';
import type { Rider } from '@/types/database';

export interface RiderSaveFields {
  name?: string;
  vehicle_type?: string;
  plate_number?: string;
  zone?: string;
}

const LOCATION_HEARTBEAT_MS = 5 * 60 * 1000; // every 5 minutes, per spec

export default function useRider() {
  const supabase = getBrowserSupabase();
  const [rider, setRider] = useState<Rider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const riderIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setRider(null);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('riders')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (fetchError) setError(fetchError.message);
    setRider((data as Rider) ?? null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (fields: RiderSaveFields) => {
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke('rider-onboarding-save', { body: fields });
      if (fnError) { setError(fnError.message); return null; }
      if (data?.error) { setError(data.error); return null; }
      setRider(data.rider as Rider);
      return data.rider as Rider;
    },
    [supabase]
  );

  // Direct table update — covered by the "Riders can update own row" RLS
  // policy, no edge function needed for a status/location flip.
  const setOnline = useCallback(
    async (online: boolean) => {
      if (!rider) return;
      let lat: number | null = null;
      let lng: number | null = null;
      if (online && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // location denied/unavailable — still go online, just unmatched until it's set
        }
      }
      const patch: Record<string, unknown> = { status: online ? 'online' : 'offline' };
      if (lat != null && lng != null) {
        patch.lat = lat;
        patch.lng = lng;
        patch.last_location_update = new Date().toISOString();
      }
      const { data, error: updateError } = await supabase.from('riders').update(patch).eq('id', rider.id).select().single();
      if (updateError) { setError(updateError.message); return; }
      setRider(data as Rider);
    },
    [rider, supabase]
  );

  // Location heartbeat: while online, refresh lat/lng every 5 minutes so
  // dispatch (nearest-rider matching) isn't working off a stale position
  // from whenever the rider happened to tap "Go online". last_location_update
  // doubles as an implicit activity signal (proves GPS + app were reachable
  // at that tick) rather than needing a separate heartbeat table.
  useEffect(() => {
    riderIdRef.current = rider?.id ?? null;
    if (rider?.status !== 'online' || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const tick = async () => {
      const currentRiderId = riderIdRef.current;
      if (!currentRiderId) return;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
        );
        await supabase
          .from('riders')
          .update({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            last_location_update: new Date().toISOString(),
          })
          .eq('id', currentRiderId);
      } catch {
        // GPS unavailable this tick — try again next interval rather than
        // taking the rider offline; a missed refresh isn't worth interrupting them for.
      }
    };

    const interval = setInterval(tick, LOCATION_HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [rider?.id, rider?.status, supabase]);

  return { rider, loading, error, save, setOnline, refresh };
}
