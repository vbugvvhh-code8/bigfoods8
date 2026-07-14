'use client';

import { useCallback, useEffect, useState } from 'react';

export type OnboardingStep =
  | 'seller-info'
  | 'restaurant-info'
  | 'location'
  | 'delivery-zone'
  | 'payment';

export const ONBOARDING_STEPS: { id: OnboardingStep; label: string; path: string }[] = [
  { id: 'seller-info', label: 'Seller', path: '/restaurant-portal/onboarding/seller-info' },
  { id: 'restaurant-info', label: 'Business', path: '/restaurant-portal/onboarding/restaurant-info' },
  { id: 'location', label: 'Location', path: '/restaurant-portal/onboarding/location' },
  { id: 'delivery-zone', label: 'Delivery', path: '/restaurant-portal/onboarding/delivery-zone' },
  { id: 'payment', label: 'Payment', path: '/restaurant-portal/onboarding/payment' },
];

export interface OnboardingDraft {
  fullName?: string;
  phone?: string;
  email?: string;
  emailVerified?: boolean;
  restaurantName?: string;
  category?: string;
  bannerUrl?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  lga?: string;
  radiusKm?: number;
}

const STORAGE_KEY = 'bf_restaurant_onboarding_draft';

function readDraft(): OnboardingDraft {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Tracks in-progress onboarding step + form draft.
 * This is local-only scratch state for a form the user hasn't submitted yet —
 * the actual restaurant record is created server-side once payment (final step) completes.
 */
export default function useOnboardingSession() {
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDraft(readDraft());
    setHydrated(true);
  }, []);

  const updateDraft = useCallback((patch: Partial<OnboardingDraft>) => {
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
