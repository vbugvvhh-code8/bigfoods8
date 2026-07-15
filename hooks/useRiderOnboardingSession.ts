'use client';

import { useCallback, useEffect, useState } from 'react';

export type RiderOnboardingStep = 'details' | 'location' | 'payment';

export const RIDER_ONBOARDING_STEPS: { id: RiderOnboardingStep; label: string; path: string }[] = [
  { id: 'details', label: 'Details', path: '/rider-portal/onboarding/details' },
  { id: 'location', label: 'Location', path: '/rider-portal/onboarding/location' },
  { id: 'payment', label: 'Verify', path: '/rider-portal/onboarding/payment' },
];

export interface RiderOnboardingDraft {
  fullName?: string;
  phone?: string;
  email?: string;
  emailVerified?: boolean;
  vehicleType?: string;
  plateNumber?: string;
  zone?: string;
  locationEnabled?: boolean;
}

const STORAGE_KEY = 'bf_rider_onboarding_draft';

function readDraft(): RiderOnboardingDraft {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Tracks in-progress rider onboarding step + form draft, same pattern as the
 * restaurant portal's useOnboardingSession. Local-only scratch state — there is
 * no `riders.profile_id` column yet (see handoff gap #1), so a real rider row
 * tied to an auth user can't be created server-side at the end of this flow
 * the way the restaurant flow does. This just keeps steps 1-2 from losing data
 * on refresh until that backend work lands.
 */
export default function useRiderOnboardingSession() {
  const [draft, setDraft] = useState<RiderOnboardingDraft>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDraft(readDraft());
    setHydrated(true);
  }, []);

  const updateDraft = useCallback((patch: Partial<RiderOnboardingDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable — draft still works for this session via state
      }
      return next;
    });
  }, []);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setDraft({});
  }, []);

  return { draft, updateDraft, clearDraft, hydrated };
}
