'use client';

import { useCallback, useEffect, useState } from 'react';

export type OnboardingStep =
  | 'seller-info'
  | 'restaurant-info'
  | 'location'
  | 'bank'
  | 'payment'
  | 'delivery-zone'
  | 'menu';

export const ONBOARDING_STEPS: { id: OnboardingStep; label: string; path: string }[] = [
  { id: 'seller-info', label: 'Seller', path: '/restaurant-portal/onboarding/seller-info' },
  { id: 'restaurant-info', label: 'Business', path: '/restaurant-portal/onboarding/restaurant-info' },
  { id: 'location', label: 'Location', path: '/restaurant-portal/onboarding/location' },
  { id: 'bank', label: 'Bank', path: '/restaurant-portal/onboarding/bank' },
  { id: 'payment', label: 'Plan', path: '/restaurant-portal/onboarding/payment' },
  { id: 'delivery-zone', label: 'Delivery', path: '/restaurant-portal/onboarding/delivery-zone' },
  { id: 'menu', label: 'Menu', path: '/restaurant-portal/onboarding/menu' },
];

/** Path of a step by id, so pages don't depend on array positions. */
export function stepPath(id: OnboardingStep): string {
  return ONBOARDING_STEPS.find((s) => s.id === id)!.path;
}

/** "Step 3 of 7" label for a step. */
export function stepLabel(id: OnboardingStep): string {
  return `Step ${ONBOARDING_STEPS.findIndex((s) => s.id === id) + 1} of ${ONBOARDING_STEPS.length}`;
}

export interface OnboardingDraft {
  fullName?: string;
  phone?: string;
  email?: string;
  emailVerified?: boolean;
  passwordSet?: boolean;
  restaurantName?: string;
  category?: string;
  bannerUrl?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  lga?: string;
  radiusKm?: number;
  // Seller details (step 1). Gender and date of birth are private — they are
  // sent to the server with the restaurant and never shown to customers.
  state?: string;
  gender?: 'female' | 'male' | 'prefer_not_to_say';
  dateOfBirth?: string; // YYYY-MM-DD
  termsAccepted?: boolean;
  seriousBusinessAck?: boolean;
  warningsAck?: boolean;
  // Business type (step 2)
  vendorType?: 'restaurant' | 'home_kitchen';
  registrationStatus?: 'registered' | 'unregistered';
  cacNumber?: string;
}

export interface EmailVerificationState {
  code?: string;
  otpStatus?: 'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error';
  otpError?: string | null;
  cooldownExpireAt?: number | null;
  lastEmailForOtp?: string;
}

const STORAGE_KEY = 'bf_restaurant_onboarding_draft';
const OTP_STORAGE_KEY = 'bf_restaurant_otp_state';

function readDraft(): OnboardingDraft {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function readOtpState(): EmailVerificationState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(OTP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Tracks in-progress onboarding step + form draft.
 * This is local-only scratch state for a form the user hasn't submitted yet —
 * the actual restaurant record is created server-side once payment (final step) completes.
 *
 * Note: a real Supabase Auth session is established earlier than that, though —
 * email OTP verification in the seller-info step (see EmailVerifyField /
 * useEmailVerification) already signs the user in, and the password step
 * right after it attaches a password to that same account via
 * supabase.auth.updateUser(). Only the `restaurants` row itself is deferred.
 */
export default function useOnboardingSession() {
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [otpState, setOtpState] = useState<EmailVerificationState>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDraft(readDraft());
    setOtpState(readOtpState());
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

  const updateOtpState = useCallback((patch: Partial<EmailVerificationState>) => {
    setOtpState((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable — state still works for this session via state
      }
      return next;
    });
  }, []);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(OTP_STORAGE_KEY);
    } catch {
      // ignore
    }
    setDraft({});
    setOtpState({});
  }, []);

  const clearOtpState = useCallback(() => {
    try {
      window.localStorage.removeItem(OTP_STORAGE_KEY);
    } catch {
      // ignore
    }
    setOtpState({});
  }, []);

  return { draft, updateDraft, clearDraft, otpState, updateOtpState, clearOtpState, hydrated };
}
