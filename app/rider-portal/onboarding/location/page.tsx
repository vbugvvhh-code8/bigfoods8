'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LocationPicker from '@/components/restaurant/onboarding/LocationPicker';
import useRiderOnboardingSession, { RIDER_ONBOARDING_STEPS } from '@/hooks/useRiderOnboardingSession';
import getBrowserSupabase from '@/lib/supabase/client';

export default function RiderLocationPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const { draft, updateDraft, hydrated, resumeStep } = useRiderOnboardingSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (hydrated && resumeStep && resumeStep !== 'location') {
      const target = RIDER_ONBOARDING_STEPS.find((s) => s.id === resumeStep);
      if (target) router.replace(target.path);
    }
  }, [hydrated, resumeStep, router]);

  if (!hydrated || resumeStep !== 'location') return null;

  const hasCoords = draft.lat != null && draft.lng != null;

  async function handleContinue() {
    setError(null);
    setSaving(true);
    try {
      const { error: saveErr } = await supabase.functions.invoke('rider-onboarding-save', {
        body: { lat: draft.lat, lng: draft.lng, zone: draft.zone },
      });
      if (saveErr) throw saveErr;
      router.push('/rider-portal/onboarding/payment');
    } catch {
      setError('Could not save your location — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        Step 3 of 4
      </p>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Where do you ride from?
      </h2>
      <p className="text-[12.5px] mb-4" style={{ color: 'var(--gray)' }}>
        This is how we match you with orders nearby.
      </p>

      <LocationPicker
        address={address}
        lga={draft.zone}
        onChange={({ address: a, lga, latitude, longitude }) => {
          setAddress(a);
          updateDraft({ zone: lga, lat: latitude, lng: longitude });
        }}
      />

      {error && (
        <p className="text-[11.5px] my-3 p-3 rounded-[9px]" style={{ background: '#FEF2F2', color: 'var(--red)' }}>
          {error}
        </p>
      )}

      <button
        onClick={handleContinue}
        disabled={!hasCoords || !draft.zone || saving}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white mb-2.5 mt-4 disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: 'var(--orange)' }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Continue
      </button>
      <button
        onClick={() => router.push('/rider-portal/onboarding/documents')}
        className="w-full py-2.5 text-[12.5px]"
        style={{ color: 'var(--gray)', background: 'none', border: 'none' }}
      >
        Back
      </button>
    </>
  );
}
