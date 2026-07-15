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

export interface EmailVerificationState {
  code?: string;
  otpStatus?: 'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error';
  otpError?: string | null;
  cooldownExpireAt?: number | null;
}

const STORAGE_KEY = 'bf_rider_onboarding_draft';
const OTP_STORAGE_KEY = 'bf_rider_otp_state';

function readDraft(): RiderOnboardingDraft {
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
 * Tracks in-progress rider onboarding step + form draft, same pattern as the
 * restaurant portal's useOnboardingSession. Local-only scratch state — there is
 * no `riders.profile_id` column yet (see handoff gap #1), so a real rider row
 * tied to an auth user can't be created server-side at the end of this flow
 * the way the restaurant flow does. This just keeps steps 1-2 from losing data
 * on refresh until that backend work lands.
 * 
 * FIX 5: Extended to also track OTP verification state (code, status, cooldown)
 * so it persists across tab switches and component remounts.
 */
export default function useRiderOnboardingSession() {
  const [draft, setDraft] = useState<RiderOnboardingDraft>({});
  const [otpState, setOtpState] = useState<EmailVerificationState>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDraft(readDraft());
    setOtpState(readOtpState());
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
