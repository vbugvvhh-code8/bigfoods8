'use client';

import { useRouter } from 'next/navigation';
import LocationToggle from '@/components/rider/onboarding/LocationToggle';
import useRiderOnboardingSession from '@/hooks/useRiderOnboardingSession';

export default function RiderLocationPage() {
  const router = useRouter();
  const { draft, updateDraft, hydrated } = useRiderOnboardingSession();

  if (!hydrated) return null;

  const enabled = draft.locationEnabled ?? true;

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--orange)' }}>
        Step 2 of 3
      </p>
      <h2 className="text-[20px] font-semibold mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Turn on your location
      </h2>
      <p className="text-[12.5px] mb-4" style={{ color: 'var(--gray)' }}>
        This is how we find orders near you.
      </p>

      <LocationToggle enabled={enabled} onChange={(v) => updateDraft({ locationEnabled: v })} />

      <button
        onClick={() => router.push('/rider-portal/onboarding/payment')}
        className="w-full py-3.5 rounded-[10px] text-[13.5px] font-semibold text-white mb-2.5"
        style={{ background: 'var(--orange)' }}
      >
        Continue
      </button>
      <button
        onClick={() => router.push('/rider-portal/onboarding/details')}
        className="w-full py-2.5 text-[12.5px]"
        style={{ color: 'var(--gray)', background: 'none', border: 'none' }}
      >
        Back
      </button>
    </>
  );
}
