'use client';

import { useState, useCallback } from 'react';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  state: string | null; // reverse-geocoded administrative state, e.g. "Anambra"
  lgaGuess: string | null; // best-effort LGA match — always let the user confirm/override
  outsideServiceArea: boolean;
  error: string | null;
  isLoading: boolean;
}

const INITIAL_STATE: LocationState = {
  latitude: null,
  longitude: null,
  address: null,
  state: null,
  lgaGuess: null,
  outsideServiceArea: false,
  error: null,
  isLoading: false,
};

export function useGeolocation() {
  const [state, setState] = useState<LocationState>(INITIAL_STATE);

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: 'Geolocation not supported' }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        let address: string | null = null;
        let detectedState: string | null = null;
        let lgaGuess: string | null = null;
        const locationIQKey = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;

        if (locationIQKey) {
          try {
            const res = await fetch(
              `https://us1.locationiq.com/v1/reverse?key=${locationIQKey}&lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
            );
            const data = await res.json();
            address = data.display_name ?? null;
            detectedState = data.address?.state ?? null;
            // Nominatim/LocationIQ's Nigerian LGA data is inconsistent about
            // which field it lands in — check the likely candidates, but
            // this is only ever a starting guess; the dropdown is always the
            // source of truth, never auto-submitted.
            lgaGuess =
              data.address?.county ??
              data.address?.state_district ??
              data.address?.city ??
              null;
          } catch {
            // Reverse geocoding failing shouldn't block getting coordinates —
            // the map picker still lets them place/confirm a precise pin.
          }
        }

        const outsideServiceArea = !!detectedState && !detectedState.toLowerCase().includes('anambra');

        setState({
          latitude,
          longitude,
          address,
          state: detectedState,
          lgaGuess,
          outsideServiceArea,
          isLoading: false,
          error: null,
        });
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          error: error.message,
          isLoading: false,
        }));
      },
      {
        // High accuracy actually matters here — false tells the browser it's
        // fine to use coarse cell-tower/WiFi positioning instead of GPS,
        // which is the main reason auto-detect was landing off-target.
        enableHighAccuracy: true,
        timeout: 15000,
        // No caching — this is a one-time precise pick during onboarding, not
        // a background location feature, so a 5-minute-old cached fix (which
        // could be from before they opened the app) isn't appropriate here.
        maximumAge: 0,
      }
    );
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return {
    ...state,
    requestLocation,
    reset,
  };
}
