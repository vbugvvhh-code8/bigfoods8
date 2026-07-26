'use client';

import { useCallback, useEffect, useState } from 'react';
import getBrowserSupabase from '@/lib/supabase/client';

export type RiderOnboardingStep = 'details' | 'documents' | 'location' | 'payment';

export const RIDER_ONBOARDING_STEPS: { id: RiderOnboardingStep; label: string; path: string }[] = [
  { id: 'details', label: 'Details', path: '/rider-portal/onboarding/details' },
  { id: 'documents', label: 'Documents', path: '/rider-portal/onboarding/documents' },
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
  isDispatchCompany?: boolean;
  companyName?: string;
  idNumber?: string;
  facePhotoUploaded?: boolean;
  idFrontUploaded?: boolean;
  idBackUploaded?: boolean;
  locationEnabled?: boolean;
  lat?: number;
  lng?: number;
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

// Which step a rider row is missing fields for -- this is the actual
// resume logic (server-side, works on any device), not the localStorage draft.
function computeResumeStep(row: Record<string, any> | null): RiderOnboardingStep {
  if (!row) return 'details';
  if (!row.name || !row.phone || !row.email || !row.vehicle_type || !row.plate_number) return 'details';
  if (!row.id_number || !row.face_photo_url || !row.id_front_url || !row.id_back_url) return 'documents';
  if (!row.lat || !row.lng) return 'location';
  if (!row.verification_fee_paid) return 'payment';
  return 'payment'; // fully done -- payment page shows the "you're verified" state
}

/**
 * Local draft is still used for in-progress typing (so a field isn't lost on
 * an accidental refresh mid-keystroke), but it's no longer the source of
 * truth for resuming onboarding. Each step's Continue button saves straight
 * to the riders row via rider-onboarding-save, and `resumeStep` here (computed
 * from that real row) is what a page should redirect to if it doesn't match
 * where the user actually is -- that's what makes "log in later, pick up
 * exactly where I left off" work on a different device or after clearing
 * browser storage, not just same-browser localStorage.
 */
export default function useRiderOnboardingSession() {
  const [draft, setDraft] = useState<RiderOnboardingDraft>({});
  const [otpState, setOtpState] = useState<EmailVerificationState>({});
  const [hydrated, setHydrated] = useState(false);
  const [resumeStep, setResumeStep] = useState<RiderOnboardingStep | null>(null);

  useEffect(() => {
    setDraft(readDraft());
    setOtpState(readOtpState());

    (async () => {
      try {
        const supabase = getBrowserSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setResumeStep('details');
          setHydrated(true);
          return;
        }
        const { data: row } = await supabase
          .from('riders')
          .select('name, phone, email, vehicle_type, plate_number, id_number, face_photo_url, id_front_url, id_back_url, lat, lng, verification_fee_paid, zone, company_name')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (row) {
          // Server row wins over stale local draft for anything it already has.
          setDraft((prev) => ({
            ...prev,
            fullName: row.name ?? prev.fullName,
            phone: row.phone ?? prev.phone,
            email: row.email ?? prev.email,
            emailVerified: row.email ? true : prev.emailVerified,
            vehicleType: row.vehicle_type ?? prev.vehicleType,
            plateNumber: row.plate_number ?? prev.plateNumber,
            zone: row.zone ?? prev.zone,
            idNumber: row.id_number ?? prev.idNumber,
            companyName: row.company_name ?? prev.companyName,
            isDispatchCompany: row.company_name ? true : prev.isDispatchCompany,
            facePhotoUploaded: !!row.face_photo_url,
            idFrontUploaded: !!row.id_front_url,
            idBackUploaded: !!row.id_back_url,
            lat: row.lat ?? prev.lat,
            lng: row.lng ?? prev.lng,
          }));
        }
        setResumeStep(computeResumeStep(row));
      } catch {
        // If the resume check fails, fall back to local draft only --
        // never block onboarding on a network hiccup.
        setResumeStep('details');
      } finally {
        setHydrated(true);
      }
    })();
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

  return { draft, updateDraft, clearDraft, otpState, updateOtpState, clearOtpState, hydrated, resumeStep };
}
